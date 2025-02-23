import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  CacheTTL,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IUser } from 'src/users/users.interface';
import { User } from 'src/decorator/customize';
import { FollowCompanyDto } from './dto/follow-company.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('companies')
@ApiTags('Companies Controller')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto, @User() user: IUser) {
    return this.companiesService.create(createCompanyDto, user);
  }

  @CacheTTL(60)
  @Get()
  findAll(@Query() query: string) {
    return this.companiesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @User() user: IUser,
  ) {
    return this.companiesService.update(id, updateCompanyDto, user);
  }
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.companiesService.remove(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/follow')
  followCompany(@Body() body: FollowCompanyDto, @User() user: IUser) {
    return this.companiesService.followCompany(body, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/unfollow')
  unfollowCompany(@Body() body: FollowCompanyDto, @User() user: IUser) {
    return this.companiesService.unfollowCompany(body, user);
  }

  @Get('/record/count')
  countCompanies() {
    return this.companiesService.countCompanies();
  }
}
