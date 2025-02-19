import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SearchCompaniesElasticsearchDto {
  @IsNotEmpty()
  @IsString()
  index: string;

  @IsNotEmpty()
  @IsString()
  query: string;

  @IsOptional()
  size: string;

  @IsOptional()
  from: string;
}
