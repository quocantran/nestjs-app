import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Job, JobDocument } from './schemas/job.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import aqp from 'api-query-params';
import { IUser } from 'src/users/users.interface';
import mongoose from 'mongoose';
import { SearchJobDto } from './dto/search-job.dto';
import { ClientProxy } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { MyElasticsearchsService } from 'src/elasticsearchs/myElasticsearchs.service';
import { CompaniesService } from 'src/companies/companies.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: SoftDeleteModel<JobDocument>,

    @Inject('NOTI_SERVICE')
    private readonly client: ClientProxy,

    @Inject('ELASTIC_SERVICE')
    private readonly elasticClient: ClientProxy,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    private readonly configService: ConfigService,

    private readonly elasticService: MyElasticsearchsService,

    private readonly companyService: CompaniesService,
  ) {}

  async getAll() {
    return await this.jobModel.find().lean().exec();
  }

  async create(createJobDto: CreateJobDto, user: IUser) {
    const newJob = await this.jobModel.create(createJobDto);

    this.client.emit('job_created', {
      senderId: createJobDto.company._id,
      content: `Công ty bạn đang theo dõi ${createJobDto.company.name} đã tạo mới công việc ${createJobDto.name}!`,
      type: 'job',
      options: {
        jobId: newJob._id,
      },
      retryCount: 0,
      queueName: this.configService.get('NOTI_QUEUE'),
    });

    this.elasticClient.emit('createDocument', {
      index: 'jobs',
      document: newJob,
      retryCount: 0,
      queueName: this.configService.get('ELASTIC_QUEUE'),
    });

    return newJob;
  }

  async insertDataToElasticsearch() {
    const jobs = await this.jobModel.find();
    for (const job of jobs) {
      const {
        _id,
        name,
        level,
        salary,
        isActive,
        skills,
        location,
        startDate,
        endDate,
        quantity,
        deletedAt,
        company,
        isDeleted,
        createdAt,
        updatedAt,
      } = job;
      const jobData = {
        _id,
        name,
        level,
        salary,
        isActive,
        company,
        startDate,
        endDate,
        quantity,
        skills,
        location,
        deletedAt,
        isDeleted,
        createdAt,
        updatedAt,
      };
      await this.elasticService.createDocument('jobs', jobData);
    }
  }

  async findAll(qs: any) {
    try {
      const cacheKey = `jobs-${JSON.stringify(qs)}`;

      const cacheValue = (await this.cacheManager.get(cacheKey)) as string;
      if (cacheValue) {
        return JSON.parse(cacheValue);
      }

      const { filter, sort, population } = aqp(qs);
      delete filter.current;
      delete filter.pageSize;
      delete filter.companyId;
      delete filter.companyName;
      const totalRecord = (await this.jobModel.find(filter)).length;
      const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
      const totalPage = Math.ceil(totalRecord / limit);
      const skip = (qs.current - 1) * limit;
      const current = +qs.current ? +qs.current : 1;
      const jobs = await this.jobModel
        .find(filter)
        .populate({
          path: 'company',
          select: {
            name: 1,
            location: 1,
            logo: 1,
            address: 1,
          },
        })
        .skip(skip)
        .limit(limit)
        .sort(sort as any);

      const response = {
        meta: {
          current: current,
          pageSize: limit,
          pages: totalPage,
          total: totalRecord,
        },
        result: jobs,
      };

      await this.cacheManager.set(cacheKey, JSON.stringify(response), {
        ttl: 60,
      });

      return response;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async addPaidUser(jobId: string, userId: string) {
    return await this.jobModel.updateOne(
      { _id: jobId },
      { $addToSet: { paidUsers: userId } },
    );
  }

  async findPaidUsers(jobId: string, userId: string) {
    return await this.jobModel.findOne({
      _id: jobId,
      paidUsers: userId,
    });
  }

  async findJobsBySkillName(names: string[]) {
    const regexNames = names.map((name) => new RegExp(name, 'i'));
    return await this.jobModel
      .find({ skills: { $in: regexNames } })
      .lean()
      .exec();
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Job not found');
    }

    const job = await this.jobModel
      .findOne({ _id: id, isDeleted: 'false' })
      .populate({
        path: 'company',
        select: {
          name: 1,
          location: 1,
          logo: 1,
          address: 1,
        },
      });

    if (!job) {
      throw new BadRequestException('Job not found');
    }
    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Job not found');
    }

    const job = {
      _id: id,
      ...updateJobDto,
      updatedBy: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    };

    this.elasticClient.emit('createDocument', {
      index: 'jobs',
      document: job,
      retryCount: 0,
      queueName: this.configService.get('ELASTIC_QUEUE'),
    });

    return await this.jobModel.updateOne({ _id: id }, job);
  }

  async remove(id: string) {
    const job = await this.jobModel.findOne({ _id: id });
    if (!job) {
      throw new BadRequestException('Job not found');
    }
    this.elasticClient.emit('deleteDocument', {
      index: 'jobs',
      id: id,
      retryCount: 0,
      queueName: this.configService.get('ELASTIC_QUEUE'),
    });
    return await this.jobModel.softDelete({ _id: id });
  }

  async search(searchJobDto: SearchJobDto) {
    try {
      const { name, location } = searchJobDto;
      const query: any = {};

      if (name) {
        const regexName = new RegExp(name, 'i').source;
        query.name = { $regex: regexName, $options: 'i' };
      }

      if (location) {
        const regexLocation = new RegExp(location, 'i').source;
        query.location = { $regex: regexLocation, $options: 'i' };
      }

      const jobs = await this.jobModel.find(query).select('name');

      return jobs;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async countJobs() {
    return await this.jobModel.countDocuments();
  }
}
