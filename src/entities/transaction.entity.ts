import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { Currency } from '@/enums/currency.enum';
import { TransactionType } from '@/enums/transaction-type.enum';

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

  @Column({ type: 'enum', enum: Currency, enumName: 'currency' })
  currency: Currency;

  @Column({ type: 'enum', enum: TransactionType, enumName: 'transaction_type' })
  type: TransactionType;

  @Column({ type: 'timestamp without time zone' })
  createdAt: Date = new Date();
}
