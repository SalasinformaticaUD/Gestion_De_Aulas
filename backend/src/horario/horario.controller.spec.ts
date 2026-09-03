import { Test, TestingModule } from '@nestjs/testing';
import { HorarioController } from './horario.controller';
import { HorarioService } from './horario.service';
import { AuthService } from '../auth/auth.service';

describe('HorarioController', () => {
  let controller: HorarioController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HorarioController],
      providers: [
        { provide: HorarioService, useValue: {} },
        { provide: AuthService, useValue: { verifyCurrentPassword: jest.fn() } },
      ],
    }).compile();

    controller = module.get<HorarioController>(HorarioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
