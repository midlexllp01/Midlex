import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { cert, getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

type ModelName =
  | 'user'
  | 'case'
  | 'document'
  | 'message'
  | 'payment'
  | 'paymentSubmission'
  | 'paymentAccount'
  | 'passwordReset'
  | 'notification'
  | 'courtDate'
  | 'inquiry'
  | 'caseTimeline'
  | 'directory'
  | 'property'
  | 'workspaceUser'
  | 'workspaceCode'
  | 'workspaceAudit'
  | 'workspaceConversation'
  | 'workspaceMessage'
  | 'workspaceBroadcast'
  | 'workspaceBroadcastRecipient';

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
  paymentSubmission: 'paymentSubmissions',
  paymentAccount: 'paymentAccounts',
  passwordReset: 'passwordResets',
  notification: 'notifications',
  courtDate: 'courtDates',
  inquiry: 'inquiries',
  caseTimeline: 'caseTimelines',
  directory: 'directory',
  property: 'properties',
  workspaceUser: 'workspaceUsers',
  workspaceCode: 'workspaceCodes',
  workspaceAudit: 'workspaceAudit',
  workspaceConversation: 'workspaceConversations',
  workspaceMessage: 'workspaceMessages',
  workspaceBroadcast: 'workspaceBroadcasts',
  workspaceBroadcastRecipient: 'workspaceBroadcastRecipients',
};

@Injectable()
export class PrismaService implements OnModuleInit {
  private isPostgres = false;
  private prismaClient: PrismaClient | null = null;
  private isOffline = false;
  private db: any = null;
  private bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  private localStore: Record<string, Record<string, any>> = {};
  private dbPath = path.join(process.env.MIDLEX_DATA_DIR || path.join(process.cwd(), 'data'), 'offline-db.json');

  user = this.model('user');
  case = this.model('case');
  document = this.model('document');
  message = this.model('message');
  payment = this.model('payment');
  paymentSubmission = this.model('paymentSubmission');
  paymentAccount = this.model('paymentAccount');
  passwordReset = this.model('passwordReset');
  notification = this.model('notification');
  courtDate = this.model('courtDate');
  inquiry = this.model('inquiry');
  caseTimeline = this.model('caseTimeline');
  directory = this.model('directory');
  property = this.model('property');
  workspaceUser = this.model('workspaceUser');
  workspaceCode = this.model('workspaceCode');
  workspaceAudit = this.model('workspaceAudit');
  workspaceConversation = this.model('workspaceConversation');
  workspaceMessage = this.model('workspaceMessage');
  workspaceBroadcast = this.model('workspaceBroadcast');
  workspaceBroadcastRecipient = this.model('workspaceBroadcastRecipient');

  async mutateWorkspaceUser(id: string, change: (current: any) => Record<string, any>) {
    if (this.isPostgres) {
      const current = await this.findUnique('workspaceUser', { where: { id } });
      if (!current) throw new Error('Workspace identity not found');
      const updated = { ...current, ...change(current), updatedAt: new Date() };
      await this.saveRow('workspaceUser', id, updated);
      return updated;
    }
    if (this.isOffline) {
      const current = this.fromLocal(this.localStore.workspaceUsers?.[id]);
      if (!current) throw new Error('Workspace identity not found');
      const updated = { ...current, ...change(current), updatedAt: new Date() };
      this.localStore.workspaceUsers[id] = this.toLocal(updated);
      this.saveLocalStore();
      return updated;
    }
    const ref = this.db.collection('workspaceUsers').doc(id);
    return this.db.runTransaction(async (tx: any) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new Error('Workspace identity not found');
      const current = this.fromDoc(snapshot);
      const updated = { ...current, ...change(current), updatedAt: new Date() };
      tx.set(ref, this.toFirestore(updated));
      return updated;
    });
  }

  // Consume before yielding in local mode; a Firestore transaction protects multiple instances.
  async consumeWorkspaceCode(id: string) {
    if (this.isPostgres) {
      const row = await this.findUnique('workspaceCode', { where: { id } });
      if (!row || row.usedAt) return null;
      const updated = { ...row, usedAt: new Date().toISOString() };
      await this.saveRow('workspaceCode', id, updated);
      return updated;
    }
    if (this.isOffline) {
      const row = this.localStore.workspaceCodes?.[id];
      if (!row || row.usedAt) return null;
      row.usedAt = new Date().toISOString();
      this.saveLocalStore();
      return this.fromLocal(row);
    }
    const ref = this.db.collection('workspaceCodes').doc(id);
    return this.db.runTransaction(async (tx: any) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists || snapshot.data().usedAt) return null;
      tx.update(ref, { usedAt: Timestamp.now() });
      return this.fromDoc(snapshot);
    });
  }

  constructor() {
    this.loadLocalStore();
  }

  async restoreRows(name: string, rows: any[]) {
    const collection = name as ModelName;
    const collectionName = COLLECTIONS[collection];
    if (!collectionName) throw new Error('Unsupported backup collection');
    const cleanRows: any[] = rows.map((row) => this.clean(row));
    if (this.isOffline) {
      if (!this.localStore[collectionName]) this.localStore[collectionName] = {};
      for (const row of cleanRows) this.localStore[collectionName][row.id] = this.toLocal(row);
      this.saveLocalStore();
      return;
    }
    if (this.isPostgres && this.prismaClient) {
      for (let start = 0; start < cleanRows.length; start += 250) {
        const statements = cleanRows.slice(start, start + 250).map((row) => this.prismaClient!.$executeRawUnsafe(
          `INSERT INTO midlex_store (collection, id, data, updated_at) VALUES ($1, $2, $3::jsonb, NOW()) ON CONFLICT (collection, id) DO UPDATE SET data = $3::jsonb, updated_at = NOW()`,
          collectionName, row.id, JSON.stringify(this.toLocal(row)),
        ));
        await this.prismaClient.$transaction(statements);
      }
      return;
    }
    const writer = this.db.bulkWriter();
    for (const row of cleanRows) writer.set(this.col(collection).doc(row.id), this.toFirestore(row));
    await writer.close();
  }

  async onModuleInit() {
    const production = process.env.NODE_ENV === 'production';
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() && process.env.MIDLEX_OFFLINE !== 'true') {
      await this.initPostgres();
    } else {
      const serviceAccount = this.readServiceAccount();
      if (process.env.MIDLEX_OFFLINE !== 'true' && (serviceAccount || process.env.FIRESTORE_EMULATOR_HOST || process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        try {
          this.db = getFirestore(this.app);
          this.isOffline = false;
        } catch (err) {
          console.warn('[PrismaService] Failed to initialize Firebase Firestore, falling back to OFFLINE mode.', err);
          if (production) throw err;
          this.isOffline = true;
        }
      } else {
        if (production) throw new Error('[PrismaService] Persistent storage is not configured. Set DATABASE_URL or Firebase Admin credentials before starting production.');
        this.isOffline = true;
        console.log('[PrismaService] Running in OFFLINE local JSON database mode.');
      }
    }
  }

  private async initPostgres() {
    try {
      this.prismaClient = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });
      await this.prismaClient.$connect();
      await this.prismaClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS midlex_store (
          collection VARCHAR(64) NOT NULL,
          id VARCHAR(128) NOT NULL,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          PRIMARY KEY (collection, id)
        );
      `);
      await this.prismaClient.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_midlex_store_collection ON midlex_store(collection);
      `);
      this.isPostgres = true;
      this.isOffline = false;
      console.log('[PrismaService] Connected to PostgreSQL (Neon) database successfully! Persistence is ACTIVE.');

      // Check if postgres store is empty and we have local offline data to migrate
      const countRes: any = await this.prismaClient.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM midlex_store');
      const count = countRes?.[0]?.count || 0;
      if (count === 0 && Object.keys(this.localStore).length > 0) {
        console.log('[PrismaService] Migrating offline local data into PostgreSQL...');
        for (const [colName, rows] of Object.entries(this.localStore)) {
          for (const [rowId, rowData] of Object.entries(rows)) {
            await this.prismaClient.$executeRawUnsafe(
              `INSERT INTO midlex_store (collection, id, data, updated_at)
               VALUES ($1, $2, $3::jsonb, NOW())
               ON CONFLICT (collection, id) DO NOTHING`,
              colName,
              rowId,
              JSON.stringify(rowData)
            );
          }
        }
        console.log('[PrismaService] Offline data successfully migrated into PostgreSQL!');
      }
    } catch (err) {
      console.error('[PrismaService] PostgreSQL initialization failed, falling back to offline mode:', err);
      if (process.env.NODE_ENV === 'production') throw err;
      this.isPostgres = false;
      this.isOffline = true;
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

  /** Ensure Firebase Admin is initialized before Auth or Firestore calls. */
  ensureFirebaseApp() {
    return this.app;
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
      updateMany: async (args: QueryArgs) => {
        const rows = await this.findMany(name, { where: args.where });
        for (const r of rows) {
          await this.update(name, { where: { id: r.id }, data: args.data });
        }
        return { count: rows.length };
      },
      delete: (args: QueryArgs) => this.delete(name, args),
      deleteMany: async (args: QueryArgs = {}) => {
        const rows = await this.findMany(name, { where: args.where });
        for (const r of rows) {
          await this.delete(name, { where: { id: r.id } });
        }
        return { count: rows.length };
      },
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
    if (this.isPostgres && this.prismaClient) {
      try {
        const rows: any = await this.prismaClient.$queryRawUnsafe(
          'SELECT data FROM midlex_store WHERE collection = $1',
          colName
        );
        return rows.map((r: any) => this.fromLocal(r.data));
      } catch (err) {
        console.warn(`[PrismaService] Error querying ${colName} from PostgreSQL:`, err);
      }
    }
    if (this.isOffline) {
      const map = this.localStore[colName] || {};
      return Object.values(map).map((row) => this.fromLocal(row));
    }
    const snap = await this.col(name).get();
    return snap.docs.map((doc: any) => this.fromDoc(doc));
  }

  private async saveRow(name: ModelName, id: string, data: any) {
    const colName = COLLECTIONS[name];
    if (this.isPostgres && this.prismaClient) {
      try {
        const jsonStr = JSON.stringify(this.toLocal(data));
        await this.prismaClient.$executeRawUnsafe(
          `INSERT INTO midlex_store (collection, id, data, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW())
           ON CONFLICT (collection, id)
           DO UPDATE SET data = $3::jsonb, updated_at = NOW()`,
          colName,
          id,
          jsonStr
        );
        return;
      } catch (err) {
        console.error(`[PrismaService] Error saving ${colName}/${id} to PostgreSQL:`, err);
      }
    }
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
    if (this.isPostgres && this.prismaClient) {
      try {
        await this.prismaClient.$executeRawUnsafe(
          'DELETE FROM midlex_store WHERE collection = $1 AND id = $2',
          colName,
          id
        );
        return;
      } catch (err) {
        console.error(`[PrismaService] Error deleting ${colName}/${id} from PostgreSQL:`, err);
      }
    }
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

    if (where.id && this.isPostgres && this.prismaClient) {
      const colName = COLLECTIONS[name];
      try {
        const rows: any = await this.prismaClient.$queryRawUnsafe(
          'SELECT data FROM midlex_store WHERE collection = $1 AND id = $2 LIMIT 1',
          colName,
          where.id
        );
        found = rows.length > 0 ? this.fromLocal(rows[0].data) : null;
      } catch (err) {
        console.warn(`[PrismaService] Error finding unique row ${colName}/${where.id}:`, err);
      }
    } else if (where.id && this.isOffline) {
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
      if (name === 'paymentSubmission') out = await this.includePaymentSubmission(out, include);
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
    if (include.payments) {
      out.payments = await this.findMany('payment', {
        where: { caseId: out.id },
        include: include.payments.include,
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
    if (include.submissions) {
      out.submissions = await this.findMany('paymentSubmission', {
        where: { paymentId: out.id },
        include: include.submissions.include,
        orderBy: include.submissions.orderBy?.submittedAt ? { submittedAt: include.submissions.orderBy.submittedAt } : undefined,
      });
    }
    return out;
  }

  private async includePaymentSubmission(row: any, include: any) {
    const out = { ...row };
    if (include.account) out.account = out.accountId ? await this.findUnique('paymentAccount', { where: { id: out.accountId }, select: include.account.select }) : null;
    if (include.verifiedBy) out.verifiedBy = out.verifiedById ? await this.findUnique('user', { where: { id: out.verifiedById }, select: include.verifiedBy.select }) : null;
    if (include.payment) out.payment = await this.findUnique('payment', { where: { id: out.paymentId }, include: include.payment.include });
    return out;
  }

  private matchesWhere(row: any, where: any): boolean {
    return Object.entries(where).every(([key, expected]) => {
      if (key === 'OR') return Array.isArray(expected) && expected.some((condition) => this.matchesWhere(row, condition));
      if (key === 'AND') return Array.isArray(expected) && expected.every((condition) => this.matchesWhere(row, condition));
      if (key === 'NOT') return Array.isArray(expected) ? expected.every((condition) => !this.matchesWhere(row, condition)) : !this.matchesWhere(row, expected);
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
    if ('not' in expected && (expected as any).not === null && (value === null || value === undefined)) return false;
    if ((expected as any).in) return (expected as any).in.includes(value);
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
