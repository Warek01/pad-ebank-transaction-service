import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { Currency } from '@/generated/proto/shared';
import { TransactionType } from '@/generated/proto/transaction_service';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, nullable: true })
  srcCardCode?: string;

  @Column({ length: 255, nullable: true })
  dstCardCode?: string;

  @Column()
  amount: number;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'timestamp without time zone' })
  timestamp: Date;
}
