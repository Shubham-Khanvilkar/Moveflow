import { Module } from '@nestjs/common';
import { EmployeeAddressService } from './employee-address.service';
import { EmployeeAddressController } from './employee-address.controller';

@Module({
  controllers: [EmployeeAddressController],
  providers: [EmployeeAddressService],
  exports: [EmployeeAddressService],
})
export class EmployeeAddressModule {}
