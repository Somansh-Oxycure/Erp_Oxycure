import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBoQTemplateDto, CreateBoQTemplateComponentDto } from './create-boq-template.dto';

export class UpdateBoQTemplateDto extends PartialType(CreateBoQTemplateDto) {
  @ApiPropertyOptional({ type: [CreateBoQTemplateComponentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBoQTemplateComponentDto)
  components?: CreateBoQTemplateComponentDto[];
}
