import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CasesModule } from './cases/cases.module';
import { CourtDatesModule } from './court-dates/court-dates.module';
import { DocumentsModule } from './documents/documents.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { LawyerModule } from './lawyer/lawyer.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { RemindersModule } from './reminders/reminders.module';
import { ChatModule } from './chat/chat.module';
import { PaymentAccountsModule } from './payment-accounts/payment-accounts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DirectoryModule } from './directory/directory.module';
import { RealtyModule } from './realty/realty.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CasesModule,
    CourtDatesModule,
    DocumentsModule,
    PaymentsModule,
    AdminModule,
    LawyerModule,
    InquiriesModule,
    RemindersModule,
    ChatModule,
    PaymentAccountsModule,
    NotificationsModule,
    DirectoryModule,
    RealtyModule,
    WorkspaceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
