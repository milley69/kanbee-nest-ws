import { JwtPayload } from '@auth/interfaces';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Cache } from 'cache-manager';
import { QuotesDto } from './dto';

export interface Quote {
  id: string;
  author_id: string;
  text: string;
}

export interface QuoteReady {
  text: string;
  username: string;
  avatar: string;
}

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: QuotesDto, userJwt: JwtPayload) {
    const { text } = dto;
    if (!text) return new ForbiddenException();
    const { id: authorId } = userJwt;
    const data = await this.prisma.quote.create({ data: { text, authorId } });
    return { data };
  }

  async get(): Promise<QuoteReady> {
    const quoteReady = await this.cacheManager.get<QuoteReady>('Quote');
    if (!quoteReady) {
      const quote: Quote[] = await this.prisma.$queryRaw`
      SELECT *
      FROM
        quotes
      ORDER BY
        (random())
        LIMIT 1
    `;
      if (quote.length === 0) return { text: 'opss...', username: '', avatar: '' };

      const { text, author_id: id } = quote[0];
      const { username, avatar } = await this.prisma.user.findUnique({ where: { id } });

      const quoteReady = { text, username, avatar };
      await this.cacheManager.set('Quote', quoteReady, 9e5);
      return quoteReady;
    }
    return quoteReady;
  }
}
