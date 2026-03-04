import { 
  Controller, Post, Body, UploadedFiles, UseInterceptors, UseGuards, Req 
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { TracksService } from './tracks.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';

@Controller('tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard) // Sèlman moun ki konekte ka upload
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]))
  async upload(
    @Req() req: any,
    @Body() body: any,
    @UploadedFiles() files: { audio?: Express.Multer.File[], cover?: Express.Multer.File[] }
  ) {
    // req.user soti nan JwtAuthGuard (ki gen id itilizatè a)
    return this.tracksService.create(req.user.id, body, files);
  }
}