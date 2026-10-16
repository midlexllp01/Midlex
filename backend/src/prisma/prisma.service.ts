import { Injectable, OnModuleInit } from '@nestjs/common';
import { cert, getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

type ModelName =
  | 'user'
  | 'case'
  | 'document'
  | 'message'
  | 'payment'
  | 'paymentAccount'
  | 'passwordReset'
  | 'notification'
  | 'courtDate'
  | 'inquiry'
  | 'caseTimeline'
  | 'directory'
  | 'property';

type QueryArgs = {
  where?: any;
  data?: any;
  include?: any;
  select?: any;
  orderBy?: Record<string, 'asc' | 'desc'>;
  take?: number;
  by?: string[];
};

const COLLECTIONS: Record<ModelName, string> = {
  user: 'users',
  case: 'cases',
  document: 'documents',
  message: 'messages',
  payment: 'payments',
  paymentAccount: 'paymentAccounts',
  passwordReset: 'passwordResets',
  notification: 'notifications',
  courtDate: 'courtDates',
  inquiry: 'inquiries',
  caseTimeline: 'caseTimelines',
  directory: 'directory',
  property: 'properties',
};

@Injectable()
export class PrismaService implements OnModuleInit {
  private isOffline = false;
  private db: any = null;
  private bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  private localStore: Record<string, Record<string, any>> = {};
  private dbPath = path.join(process.cwd(), 'data', 'offline-db.json');

  user = this.model('user');
  case = this.model('case');
  document = this.model('document');
  message = this.model('message');
  payment = this.model('payment');
  paymentAccount = this.model('paymentAccount');
  passwordReset = this.model('passwordReset');
  notification = this.model('notification');
  courtDate = this.model('courtDate');
  inquiry = this.model('inquiry');
  caseTimeline = this.model('caseTimeline');
  directory = this.model('directory');
  property = this.model('property');

  constructor() {
    const serviceAccount = this.readServiceAccount();
    if (!serviceAccount && !process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.isOffline = true;
      console.log('[PrismaService] Running in OFFLINE local JSON database mode.');
      this.loadLocalStore();
    } else {
      try {
        this.db = getFirestore(this.app);
      } catch (err) {
        console.warn('[PrismaService] Failed to initialize Firebase Firestore, falling back to OFFLINE mode.', err);
        this.isOffline = true;
        this.loadLocalStore();
      }
    }
  }

  async onModuleInit() {
    if (this.isOffline) {
      this.loadLocalStore();
    }
    await this.seedDefaultUsers();
  }

  private async seedDefaultUsers() {
    try {
      const defaultUsers = [
        {
          email: 'abeddybaba@gmail.com',
          name: 'Super Admin',
          password: 'Abeddy9498#',
          role: 'ADMIN',
        },
        {
          email: 'midlexllp01@gmail.com',
          name: 'Super Admin (Legacy)',
          password: 'Admin@123',
          role: 'ADMIN',
        },
        {
          email: 'lawyer1@midlex.com',
          name: 'Barr. Adebayo',
          password: 'admin123',
          role: 'LAWYER',
          phone: '08012345678',
        },
        {
          email: 'samson@midlex.com',
          name: 'Samson Sabbat',
          password: 'samson123',
          role: 'LAWYER',
          phone: '08022223333',
        },
        {
          email: 'accountant@midlex.com',
          name: 'Chief Accountant (Finance)',
          password: 'accountant123',
          role: 'ACCOUNTANT',
          phone: '08098765432',
        },
        {
          email: 'client@midlex.com',
          name: 'Demo Client (John Doe)',
          password: 'client123',
          role: 'CLIENT',
          phone: '08033334444',
        },
        {
          email: 'user@midlex.com',
          name: 'Standard User (Jane Doe)',
          password: 'user123',
          role: 'CLIENT',
          phone: '08055556666',
        },
      ];

      for (const u of defaultUsers) {
        const normalizedEmail = u.email.trim().toLowerCase();
        const existing = await this.findUnique('user', { where: { email: normalizedEmail } });
        const hashedPassword = await bcrypt.hash(u.password, 10);

        if (!existing) {
          await this.create('user', {
            data: {
              email: normalizedEmail,
              name: u.name,
              password: hashedPassword,
              role: u.role,
              phone: u.phone || null,
            },
          });
          console.log(`[PrismaService] Auto-seeded default user: ${normalizedEmail}`);
        } else {
          await this.update('user', {
            where: { id: existing.id },
            data: { password: hashedPassword, role: u.role, name: u.name },
          });
          console.log(`[PrismaService] Updated credentials for default user: ${normalizedEmail}`);
        }
      }
    } catch (err) {
      console.warn('[PrismaService] Auto-seed default users error:', err);
    }
  }

  private loadLocalStore() {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        this.localStore = JSON.parse(raw);
      } else {
        this.localStore = {};
      }
    } catch (err) {
      console.error('[PrismaService] Error loading offline DB file:', err);
      this.localStore = {};
    }
  }

  private saveLocalStore() {
    if (!this.isOffline) return;
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbPath, JSON.stringify(this.localStore, null, 2), 'utf8');
    } catch (err) {
      console.error('[PrismaService] Error saving offline DB file:', err);
    }
  }

  get storageBucket() {
    if (this.isOffline || !this.bucketName) return null;
    return getStorage(this.app).bucket(this.bucketName);
  }

  private get app() {
    if (this.isOffline) return null as any;
    if (getApps().length) return getApps()[0]!;

    const serviceAccount = this.readServiceAccount();
    return initializeApp({
      credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }

  private readServiceAccount() {
    const raw =
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
        ? Buffer.from(
            process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
            'base64',
          ).toString('utf8')
        : '');

    if (!raw.trim()) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return parsed;
    } catch (err) {
      console.error(
        '[firebase] Invalid service account JSON/base64.',
        err,
      );
      return null;
    }
  }

  private model(name: ModelName) {
    return {
      create: (args: QueryArgs) => this.create(name, args),
      findUnique: (args: QueryArgs) => this.findUnique(name, args),
      findMany: (args: QueryArgs = {}) => this.findMany(name, args),
      update: (args: QueryArgs) => this.update(name, args),
      delete: (args: QueryArgs) => this.delete(name, args),
      count: (args: QueryArgs = {}) => this.count(name, args),
      groupBy: (args: QueryArgs) => this.groupBy(name, args),
    };
  }

  private col(name: ModelName) {
    if (this.isOffline || !this.db) return null;
    return this.db.collection(COLLECTIONS[name]);
  }

  private async getRawRows(name: ModelName): Promise<any[]> {
    const colName = COLLECTIONS[name];
    if (this.isOffline) {
      const map = this.localStore[colName] || {};
      return Object.values(map).map((row) => this.fromLocal(row));
    }
    const snap = await this.col(name).get();
    return snap.docs.map((doc: any) => this.fromDoc(doc));
  }

  private async saveRow(name: ModelName, id: string, data: any) {
    const colName = COLLECTIONS[name];
    if (this.isOffline) {
      if (!this.localStore[colName]) {
        this.localStore[colName] = {};
      }
      this.localStore[colName][id] = this.toLocal(data);
      this.saveLocalStore();
      return;
    }
    await this.col(name).doc(id).set(this.toFirestore(data), { merge: true });
  }

  private async deleteRow(name: ModelName, id: string) {
    const colName = COLLECTIONS[name];
    if (this.isOffline) {
      if (this.localStore[colName]) {
        delete this.localStore[colName][id];
        this.saveLocalStore();
      }
      return;
    }
    await this.col(name).doc(id).delete();
  }

  private async create(name: ModelName, args: QueryArgs) {
    const now = new Date();
    const id = args.data?.id || randomUUID();
    const data = this.clean({
      ...args.data,
      id,
      createdAt: args.data?.createdAt || now,
      updatedAt:
        name === 'document' || name === 'message'
          ? args.data?.updatedAt
          : args.data?.updatedAt || now,
    });

    if (name === 'user') {
      const existing = await this.findMany('user', {
        where: { email: data.email },
        take: 1,
      });
      if (existing.length) {
        const err: any = new Error('Email already in use');
        err.code = 'P2002';
        throw err;
      }
    }

    await this.saveRow(name, id, data);
    return this.withRelations(name, data, args.include, args.select);
  }

  private async findUnique(name: ModelName, args: QueryArgs) {
    const where = args.where || {};
    let found: any = null;

    if (where.id && this.isOffline) {
      const colName = COLLECTIONS[name];
      const raw = this.localStore[colName]?.[where.id];
      found = raw ? this.fromLocal(raw) : null;
    } else if (where.id && !this.isOffline) {
      const snap = await this.col(name).doc(where.id).get();
      found = snap.exists ? this.fromDoc(snap) : null;
    } else {
      const rows = await this.findMany(name, { where, take: 1 });
      found = rows[0] || null;
    }

    if (!found) return null;
    return this.withRelations(name, found, args.include, args.select);
  }

  private async findMany(name: ModelName, args: QueryArgs = {}) {
    let rows = await this.getRawRows(name);

    if (args.where) {
      rows = rows.filter((row) => this.matchesWhere(row, args.where));
    }

    if (args.orderBy) {
      const [[key, dir]] = Object.entries(args.orderBy);
      rows.sort((a, b) => this.compare(a[key], b[key], dir));
    }

    if (typeof args.take === 'number') rows = rows.slice(0, args.take);

    return Promise.all(
      rows.map((row) => this.withRelations(name, row, args.include, args.select)),
    );
  }

  private async update(name: ModelName, args: QueryArgs) {
    const existing = await this.findUnique(name, { where: args.where });
    if (!existing) throw new Error(`${name} not found`);

    const data = this.clean({
      ...existing,
      ...args.data,
      updatedAt:
        name === 'document' || name === 'message'
          ? existing.updatedAt
          : new Date(),
    });
    await this.saveRow(name, existing.id, data);
    return this.withRelations(name, data, args.include, args.select);
  }

  private async delete(name: ModelName, args: QueryArgs) {
    const existing = await this.findUnique(name, { where: args.where });
    if (!existing) throw new Error(`${name} not found`);
    await this.deleteRow(name, existing.id);
    return existing;
  }

  private async count(name: ModelName, args: QueryArgs = {}) {
    return (await this.findMany(name, { where: args.where })).length;
  }

  private async groupBy(name: ModelName, args: QueryArgs) {
    const rows = await this.findMany(name, { where: args.where });
    const keys = args.by || [];
    const seen = new Map<string, any>();
    for (const row of rows) {
      const grouped = Object.fromEntries(keys.map((key) => [key, row[key]]));
      seen.set(JSON.stringify(grouped), grouped);
    }
    return [...seen.values()];
  }

  private async withRelations(
    name: ModelName,
    row: any,
    include?: any,
    select?: any,
  ) {
    let out = { ...row };

    if (include) {
      if (name === 'case') out = await this.includeCase(out, include);
      if (name === 'document' && include.uploadedBy) {
        out.uploadedBy = await this.findUnique('user', {
          where: { id: out.uploadedById },
          select: include.uploadedBy.select,
        });
      }
      if (name === 'message' && include.sender) {
        out.sender = await this.findUnique('user', {
          where: { id: out.senderId },
          select: include.sender.select,
        });
      }
      if (name === 'payment') out = await this.includePayment(out, include);
      if (name === 'courtDate' && include.case) {
        out.case = await this.findUnique('case', {
          where: { id: out.caseId },
          select: include.case.select,
        });
      }
      if (name === 'user' && include._count) {
        out._count = {
          casesAsLawyer: await this.count('case', {
            where: { lawyerId: out.id },
          }),
        };
      }
    }

    return this.applySelect(out, select);
  }

  private async includeCase(row: any, include: any) {
    const out = { ...row };
    if (include.client) {
      out.client = await this.findUnique('user', {
        where: { id: out.clientId },
        select: include.client.select,
      });
    }
    if (include.lawyer) {
      out.lawyer = out.lawyerId
        ? await this.findUnique('user', {
            where: { id: out.lawyerId },
            select: include.lawyer.select,
          })
        : null;
    }
    if (include.documents) {
      out.documents = await this.findMany('document', {
        where: { caseId: out.id },
      });
    }
    if (include.messages) {
      out.messages = await this.findMany('message', {
        where: { caseId: out.id },
        include: include.messages.include,
        orderBy: { createdAt: 'asc' },
      });
    }
    if (include.courtDates) {
      out.courtDates = await this.findMany('courtDate', {
        where: { caseId: out.id },
        orderBy: { date: 'asc' },
      });
    }
    if (include.timeline) {
      out.timeline = await this.findMany('caseTimeline', {
        where: { caseId: out.id },
        orderBy: { date: 'asc' },
      });
    }
    return out;
  }

  private async includePayment(row: any, include: any) {
    const out = { ...row };
    if (include.case) {
      out.case = await this.findUnique('case', {
        where: { id: out.caseId },
        select: include.case.select,
      });
    }
    if (include.client) {
      out.client = await this.findUnique('user', {
        where: { id: out.clientId },
        select: include.client.select,
      });
    }
    if (include.account) {
      out.account = out.accountId
        ? await this.findUnique('paymentAccount', {
            where: { id: out.accountId },
            select: include.account.select,
          })
        : null;
    }
    if (include.verifiedBy) {
      out.verifiedBy = out.verifiedById
        ? await this.findUnique('user', {
            where: { id: out.verifiedById },
            select: include.verifiedBy.select,
          })
        : null;
    }
    return out;
  }

  private matchesWhere(row: any, where: any): boolean {
    return Object.entries(where).every(([key, expected]) => {
      if (key === 'case') return this.matchesCaseRelation(row, expected);
      return this.matchesValue(row[key], expected);
    });
  }

  private matchesCaseRelation(row: any, where: any) {
    if (!where || !Object.keys(where).length) return true;
    return false;
  }

  private matchesValue(value: any, expected: any): boolean {
    if (expected === null) return value === null || value === undefined;
    if (
      typeof expected !== 'object' ||
      expected instanceof Date ||
      Array.isArray(expected)
    ) {
      return value === expected;
    }

    if (expected.notIn) return !expected.notIn.includes(value);
    if (expected.gte !== undefined && this.asTime(value) < this.asTime(expected.gte)) {
      return false;
    }
    if (expected.lte !== undefined && this.asTime(value) > this.asTime(expected.lte)) {
      return false;
    }
    if (expected.lt !== undefined && this.asTime(value) >= this.asTime(expected.lt)) {
      return false;
    }
    return true;
  }

  private compare(a: any, b: any, dir: 'asc' | 'desc') {
    const av = this.asTime(a);
    const bv = this.asTime(b);
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * (dir === 'asc' ? 1 : -1);
  }

  private asTime(value: any) {
    if (value instanceof Date) return value.getTime();
    if (value?.toDate) return value.toDate().getTime();
    if (typeof value === 'string') {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return value ?? 0;
  }

  private applySelect(row: any, select?: any) {
    if (!select) return row;
    const selected: any = {};
    for (const [key, enabled] of Object.entries(select)) {
      if (enabled === true) selected[key] = row[key];
    }
    return selected;
  }

  private clean(data: any) {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
  }

  private toLocal(data: any): any {
    if (data instanceof Date) return data.toISOString();
    if (Array.isArray(data)) return data.map((item) => this.toLocal(item));
    if (data && typeof data === 'object') {
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, this.toLocal(value)]),
      );
    }
    return data;
  }

  private fromLocal(data: any): any {
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
      return new Date(data);
    }
    if (Array.isArray(data)) return data.map((item) => this.fromLocal(item));
    if (data && typeof data === 'object') {
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, this.fromLocal(value)]),
      );
    }
    return data;
  }

  private toFirestore(data: any) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value instanceof Date ? Timestamp.fromDate(value) : value,
      ]),
    );
  }

  private fromDoc(doc: any) {
    const data = doc.data() || {};
    return this.fromFirestore({ id: doc.id, ...data });
  }

  private fromFirestore(data: any): any {
    if (data?.toDate) return data.toDate();
    if (Array.isArray(data)) return data.map((item) => this.fromFirestore(item));
    if (data && typeof data === 'object') {
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          this.fromFirestore(value),
        ]),
      );
    }
    return data;
  }
}
