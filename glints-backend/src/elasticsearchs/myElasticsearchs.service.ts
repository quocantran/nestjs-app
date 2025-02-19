import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CompaniesService } from 'src/companies/companies.service';
import { JobsService } from 'src/jobs/jobs.service';
import { SearchCompaniesElasticsearchDto } from './dto/search-companies-elasticsearch.dto';
import { GetPaginateElasticsearchDto } from './dto/get-paginate-elasticsearch.dto';
import { SearchJobsElasticsearchDto } from './dto/search-jobs-elasticsearch-dto';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class MyElasticsearchsService {
  constructor(
    private readonly elasticsearchsService: ElasticsearchService,

    @Inject('ERROR_SERVICE')
    private readonly errorClient: ClientProxy,
  ) {}

  async searchCompanies(data: SearchCompaniesElasticsearchDto) {
    let res;
    const { index, query } = data;
    res = await this.elasticsearchsService.search({
      index,
      body: {
        query: {
          bool: {
            must: [
              {
                wildcard: {
                  name: `*${query}*`,
                },
              },
            ],
            must_not: [
              {
                exists: {
                  field: 'deletedAt',
                },
              },
            ],
          },
        },
        size: parseInt(data.size) || 50,
        from: parseInt(data.from) || 0,
      },
      _source: [
        'name',
        'description',
        'address',
        'logo',
        'createdAt',
        'updatedAt',
        'mongo_id',
      ],
    });

    if (res.body.hits.hits.length === 0) {
      res = await this.elasticsearchsService.search({
        index,
        body: {
          query: {
            bool: {
              must: [
                {
                  match: {
                    name: query,
                  },
                },
              ],
              must_not: [
                {
                  exists: {
                    field: 'deletedAt',
                  },
                },
              ],
            },
          },
          size: parseInt(data.size) || 50,
          from: parseInt(data.from) || 0,
        },
        _source: [
          'name',
          'description',
          'address',
          'logo',
          'createdAt',
          'updatedAt',
          'mongo_id',
        ],
      });
    }

    return res.body.hits;
  }

  async searchJobs(data: SearchJobsElasticsearchDto) {
    const {
      index,
      name,
      location,
      size,
      from,
      level,
      salary,
      sort,
      companyId,
    } = data;
    const isExist = await this.elasticsearchsService.indices.exists({
      index,
    });

    if (!isExist) {
      throw new BadRequestException('Index not found!');
    }

    // Xây dựng truy vấn động
    const mustQueries = [];
    const sortQueries = [];
    const mustMatchQueries = [];
    mustQueries.push({
      match: {
        isActive: true,
      },
    });
    if (name) {
      mustQueries.push({
        wildcard: {
          name: `*${name}*`,
        },
      });
    }

    if (companyId) {
      mustQueries.push({
        match: {
          'company._id': companyId,
        },
      });

      mustMatchQueries.push({
        match: {
          'company._id': companyId,
        },
      });
    }

    if (location) {
      mustQueries.push({
        wildcard: {
          location: `*${location}*`,
        },
      });
    }

    if (sort) {
      sortQueries.push({
        [sort]: {
          order: 'desc',
        },
      });
    }

    if (level) {
      mustQueries.push({
        match: {
          level: level,
        },
      });
    }
    if (salary) {
      const [minSalary, maxSalary] = salary
        .split('-')
        .map((s) => parseInt(s.trim().replace(/\D/g, '')));
      mustQueries.push({
        range: {
          salary: {
            gte: minSalary,
            lte: maxSalary,
          },
        },
      });
    }

    let res = await this.elasticsearchsService.search({
      index,
      body: {
        query: {
          bool: {
            must: mustQueries,
            must_not: [
              {
                exists: {
                  field: 'deletedAt',
                },
              },
            ],
          },
        },
        sort: sortQueries,
        size: parseInt(size) || 50,
        from: parseInt(from) || 0,
      },
    });

    // Nếu không có kết quả từ truy vấn wildcard, thực hiện truy vấn match
    if (res.body.hits.hits.length === 0) {
      mustMatchQueries.push({
        match: {
          isActive: true,
        },
      });
      if (name) {
        mustMatchQueries.push({
          match: {
            name: name,
          },
        });
      }
      if (location) {
        mustMatchQueries.push({
          match: {
            location: location,
          },
        });
      }

      if (level) {
        mustMatchQueries.push({
          match: {
            level: level,
          },
        });
      }

      if (salary) {
        const [minSalary, maxSalary] = salary
          .split('-')
          .map((s) => parseInt(s.trim().replace(/\D/g, '')));
        mustMatchQueries.push({
          range: {
            salary: {
              gte: minSalary,
              lte: maxSalary,
            },
          },
        });
      }

      res = await this.elasticsearchsService.search({
        index,
        body: {
          query: {
            bool: {
              must: mustMatchQueries,
              must_not: [
                {
                  exists: {
                    field: 'deletedAt',
                  },
                },
              ],
            },
          },
          sort: sortQueries,
          size: parseInt(size) || 50,
          from: parseInt(from) || 0,
        },
      });
    }

    return res.body.hits;
  }

  async delete(index: string, id: string) {
    return await this.elasticsearchsService.delete({
      index,
      id,
    });
  }

  async getMapping(index: string) {
    return await this.elasticsearchsService.indices.getMapping({
      index,
    });
  }
  async createDocument(index: string, document: any) {
    const { _id, ...body } = document;
    return await this.elasticsearchsService.index({
      index,
      id: _id,
      body: body,
      refresh: 'wait_for',
    });
  }

  async getDocumentsPaginate(data: GetPaginateElasticsearchDto) {
    const isExist = await this.elasticsearchsService.indices.exists({
      index: data.index,
    });

    if (!isExist) {
      throw new BadRequestException('Index not found!');
    }
    const { index, from, size } = data;
    const res = await this.elasticsearchsService.search({
      index,
      body: {
        query: {
          bool: {
            must: [
              {
                match_all: {},
              },
            ],

            must_not: [
              {
                exists: {
                  field: 'deletedAt',
                },
              },
            ],
          },
        },
      },
      from: parseInt(from),
      size: parseInt(size),
      _source: [
        'name',
        'description',
        'address',
        'logo',
        'createdAt',
        'updatedAt',
        'mongo_id',
        'isActive',
      ],
    });

    return res.body.hits;
  }

  async checkIndexExists(index: string) {
    return await this.elasticsearchsService.indices.exists({
      index,
    });
  }

  async createIndex(index: string, body?: any) {
    return await this.elasticsearchsService.indices.create({
      index,
      body,
    });
  }

  logErrorToElastic(pattern: string, data: any) {
    this.errorClient.emit(pattern, data);
  }
}
