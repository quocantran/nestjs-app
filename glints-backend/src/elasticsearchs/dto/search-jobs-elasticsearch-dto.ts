import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SearchJobsElasticsearchDto {
  @IsNotEmpty()
  @IsString()
  index: string;

  @IsOptional()
  name: string;

  @IsOptional()
  location: string;

  @IsOptional()
  level: string;

  @IsOptional()
  salary: string;

  @IsOptional()
  sort: string;

  @IsOptional()
  companyId: string;

  @IsOptional()
  size: string;

  @IsOptional()
  from: string;
}
