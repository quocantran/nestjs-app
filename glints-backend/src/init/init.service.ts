import { Injectable, OnModuleInit } from '@nestjs/common';
import { CompaniesService } from 'src/companies/companies.service';
import { MyElasticsearchsService } from 'src/elasticsearchs/myElasticsearchs.service';
import { JobsService } from 'src/jobs/jobs.service';

@Injectable()
export class InitService implements OnModuleInit {
  constructor(
    private readonly jobsService: JobsService,
    private readonly elasticsearchService: MyElasticsearchsService,
    private readonly companyService: CompaniesService,
  ) {}

  async onModuleInit() {
    const indexExists = await this.elasticsearchService.checkIndexExists(
      'jobs',
    );
    if (!indexExists.body) {
      const body = {
        mappings: {
          properties: {
            logo: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            name: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            createdAt: {
              type: 'date',
            },
            description: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            endDate: {
              type: 'date',
            },
            isActive: {
              type: 'boolean',
            },
            isDeleted: {
              type: 'boolean',
            },
            level: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            location: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            quantity: {
              type: 'long',
            },
            salary: {
              type: 'long',
            },
            skills: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            startDate: {
              type: 'date',
            },
            updatedAt: {
              type: 'date',
            },
            updatedBy: {
              properties: {
                _id: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                email: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                name: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
              },
            },
          },
        },
      };
      await this.elasticsearchService.createIndex('jobs', body);
      await this.jobsService.insertDataToElasticsearch();
    }

    const indexExistsCompanies =
      await this.elasticsearchService.checkIndexExists('companies');

    if (!indexExistsCompanies.body) {
      await this.elasticsearchService.createIndex('companies');
      await this.companyService.insertDataToElasticsearch();
    }
  }
}
