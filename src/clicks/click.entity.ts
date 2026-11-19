import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Link } from '../links/link.entity.js';

export type Device = 'mobile' | 'desktop' | 'bot' | 'other';

@Entity({ name: 'clicks' })
@Index(['linkId', 'clickedAt'])
export class Click {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  @Column({ type: 'uuid', name: 'link_id' })
  linkId: string;

  @ManyToOne(() => Link, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'link_id' })
  link?: Link;

  @Column({ type: 'timestamptz', name: 'clicked_at' })
  clickedAt: Date;

  /** Only the referring site's hostname, never the full URL. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  referrer: string | null;

  @Column({ type: 'varchar', length: 16 })
  device: Device;
}
