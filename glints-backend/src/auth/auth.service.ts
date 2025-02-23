import { BadRequestException, Injectable, Logger, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Response } from 'express';
import ms from 'ms';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Role, RoleDocument } from 'src/roles/schemas/role.schema';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { IUser } from 'src/users/users.interface';
import { UsersService } from 'src/users/users.service';
import crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
    @InjectModel(Role.name) private roleModel: SoftDeleteModel<RoleDocument>,
    private configService: ConfigService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findUserByUsername(username);
    if (user) {
      const isValid = this.usersService.checkPassword(pass, user.password);
      if (isValid) {
        const userRole = user.role;
        const data = (await this.roleModel.findOne({ _id: userRole }).populate({
          path: 'permissions',
          select: {
            name: 1,
            _id: 1,
            apiPath: 1,
            method: 1,
            module: 1,
          },
        })) as any;
        const result = {
          ...user.toObject(),
          permissions: data?.permissions ?? [],
        };
        return result;
      }
    }
    return null;
  }

  generateRefreshToken = (payload: any) => {
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn:
        ms(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) / 1000,
    });

    return refreshToken;
  };

  async login(user: IUser, res: Response) {
    const { _id, name, email, role } = user;

    const payload = {
      sub: 'token login',
      iss: 'from server',
      email,
      _id,
      role,
      name,
    };
    const refreshToken = this.generateRefreshToken(payload);
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: ms(this.configService.get<string>('JWT_EXPIRES_IN')) / 1000,
    });
    await this.usersService.updateUserToken(refreshToken, _id);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      maxAge:
        ms(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) * 1000,
      sameSite: 'none',
      secure: true,
    });

    return {
      access_token: accessToken,
      user: {
        _id,
        email,
        name,
        role,
        permissions: user.permissions,
      },
    };
  }

  async register(createUserDto: CreateUserDto) {
    const isExistEmail = await this.userModel.findOne({
      email: createUserDto.email,
    });

    if (isExistEmail) {
      throw new BadRequestException('Email already exists');
    }

    createUserDto.password = this.usersService.hashPassword(
      createUserDto.password,
    );

    const USER_ROLE = 'NORMAL_USER';
    const userRole = await this.roleModel.findOne({ name: USER_ROLE });
    const newUser = await this.userModel.create({
      ...createUserDto,
      role: userRole?._id,
    });

    return {
      _id: newUser._id,
      createdAt: newUser.createdAt,
    };
  }

  async googleLogin(req: any, res: Response) {
    const { user } = req;

    const isExistEmail = (await this.userModel.findOne({
      email: user.email,
    })) as unknown as IUser;
    let currentUser: IUser;
    let userRole: any;

    const newPassword = crypto.randomBytes(20).toString('hex');

    const hashedPassword = this.usersService.hashPassword(newPassword);

    if (!isExistEmail) {
      const USER_ROLE = 'NORMAL_USER';
      userRole = await this.roleModel.findOne({ name: USER_ROLE });
      currentUser = (await this.userModel.create({
        email: user.email,
        name: user.firstName + ' ' + user.lastName,
        role: userRole?._id,
        password: hashedPassword,
        permissions: [],
      })) as unknown as IUser;
    } else {
      userRole = await this.roleModel.findOne({ _id: isExistEmail.role });

      await this.userModel.updateOne(
        {
          email: user.email,
        },
        {
          $set: {
            name: user.firstName + ' ' + user.lastName,
          },
        },
      );

      currentUser = {
        email: isExistEmail.email,
        _id: isExistEmail._id,
        role: isExistEmail.role,
        name: user.firstName + ' ' + user.lastName,
        permissions: userRole.permissions,
      };
    }

    const payload = {
      sub: 'token login',
      iss: 'from server',
      email: currentUser.email,
      _id: currentUser._id,
      role: {
        _id: userRole._id,
        name: userRole.name,
      },
      name: currentUser.name,
    };
    const refreshToken = this.generateRefreshToken(payload);
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: ms(this.configService.get<string>('JWT_EXPIRES_IN')) / 1000,
    });
    await this.usersService.updateUserToken(refreshToken, currentUser._id);
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      maxAge:
        ms(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) * 1000,
      sameSite: 'none',
      secure: true,
    });

    return {
      access_token: accessToken,
    };
  }

  async handleAccount(user: IUser) {
    const currUser = await this.userModel.findOne({ _id: user._id });
    const role = (await this.roleModel
      .findOne({ _id: currUser.role })
      .populate({
        path: 'permissions',
        select: {
          name: 1,
          _id: 1,
          apiPath: 1,
          method: 1,
          module: 1,
        },
      })) as any;

    user.permissions = role.permissions;
    user.role = {
      _id: role._id,
      name: role.name,
    };

    return { user };
  }

  generateNewToken = async (refreshToken: string, res: Response) => {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (!payload) {
        throw new BadRequestException('Invalid refresh token');
      }

      const user = await this.userModel.findOne({ refreshToken }).populate({
        path: 'role',
        select: {
          name: 1,
          _id: 1,
        },
      });
      if (user) {
        const { _id, name, email, role } = user;
        const newPayload = {
          sub: 'token login',
          iss: 'from server',
          email,
          _id,
          role,
          name,
        };
        const newRefreshToken = this.generateRefreshToken(newPayload);
        await this.usersService.updateUserToken(
          newRefreshToken,
          _id.toString(),
        );

        const userRole = user.role;
        const data = (await this.roleModel.findOne({ _id: userRole }).populate({
          path: 'permissions',
          select: {
            name: 1,
            _id: 1,
            apiPath: 1,
            method: 1,
            module: 1,
          },
        })) as any;
        res.cookie('refresh_token', newRefreshToken, {
          httpOnly: true,
          maxAge:
            ms(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) * 1000,
          sameSite: 'none',
          secure: true,
        });

        return {
          access_token: this.jwtService.sign(newPayload, {
            secret: this.configService.get<string>('JWT_SECRET'),
            expiresIn:
              ms(this.configService.get<string>('JWT_EXPIRES_IN')) / 1000,
          }),
          user: {
            _id,
            email,
            name,
            role,
            permissions: data?.permissions ?? [],
          },
        };
      }
    } catch (err) {
      throw new BadRequestException('Invalid refresh token');
    }
  };

  logout = async (user: IUser, res: Response) => {
    await this.usersService.updateUserToken('', user._id);
    res.clearCookie('refresh_token');
    res.clearCookie('userId');
    return 'Logout success!';
  };
}
