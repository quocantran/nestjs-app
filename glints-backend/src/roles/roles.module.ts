import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './schemas/role.schema';
import { UsersModule } from 'src/users/users.module';
import { PermissionsModule } from 'src/permissions/permissions.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
    UsersModule,
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService, RolesModule],
})
export class RolesModule {}
