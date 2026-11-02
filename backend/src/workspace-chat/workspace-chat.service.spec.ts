import { WorkspaceChatService } from './workspace-chat.service';

const developer = { id: 'dev', name: 'Developer', email: 'dev@midlex.xyz', role: 'DEVELOPER', active: true };
const alice = { id: 'alice', name: 'Alice', email: 'alice@midlex.xyz', role: 'STAFF', active: true };
const bob = { id: 'bob', name: 'Bob', email: 'bob@midlex.xyz', role: 'STAFF', active: true };

function fixture() {
  const users = [developer, alice, bob];
  const db = {
    workspaceUser: {
      findMany: jest.fn(async () => users),
      findUnique: jest.fn(async ({ where }: any) => users.find(user => user.id === where.id) || null),
    },
    workspaceConversation: {
      findMany: jest.fn(async () => [] as any[]),
      findUnique: jest.fn(async () => null as any),
      create: jest.fn(async ({ data }: any) => ({ id: 'conversation-1', ...data })),
      update: jest.fn(async () => ({})),
    },
    workspaceMessage: {
      findMany: jest.fn(async () => [] as any[]),
      create: jest.fn(async ({ data }: any) => ({ id: 'message-1', ...data })),
    },
    workspaceBroadcast: { create: jest.fn(async ({ data }: any) => ({ id: 'broadcast-1', ...data })) },
    workspaceBroadcastRecipient: { create: jest.fn(async () => ({})) },
    workspaceAudit: { create: jest.fn(async () => ({})) },
  };
  return { db, chat: new WorkspaceChatService(db as any, {} as any) };
}

describe('WorkspaceChatService direct messaging', () => {
  it('lists every active colleague for staff, except the current user', async () => {
    const { chat } = fixture();
    expect((await chat.recipients(alice)).map(user => user.id)).toEqual(['dev', 'bob']);
  });

  it('lets staff start a private chat with another staff member', async () => {
    const { chat, db } = fixture();
    const result = await chat.createConversation(alice, { userId: 'bob', content: 'Hello Bob' });
    expect(db.workspaceConversation.create).toHaveBeenCalledWith({ data: { type: 'DIRECT', adminId: 'alice', userId: 'bob', broadcastId: null } });
    expect(db.workspaceMessage.create).toHaveBeenCalledWith({ data: { conversationId: 'conversation-1', senderId: 'alice', content: 'Hello Bob', readAt: null } });
    expect(result.otherUser.id).toBe('bob');
  });

  it('reuses the same direct conversation in either direction', async () => {
    const { chat, db } = fixture();
    db.workspaceConversation.findMany.mockResolvedValue([{ id: 'old-chat', type: 'DIRECT', adminId: 'bob', userId: 'alice' }]);
    const result = await chat.createConversation(alice, { userId: 'bob', content: 'Another message' });
    expect(db.workspaceConversation.create).not.toHaveBeenCalled();
    expect(result.id).toBe('old-chat');
  });

  it('keeps conversations private to their two members', async () => {
    const { chat, db } = fixture();
    db.workspaceConversation.findUnique.mockResolvedValue({ id: 'private-chat', adminId: 'alice', userId: 'bob' });
    await expect(chat.sendMessage(developer, 'private-chat', { content: 'Hello' })).rejects.toThrow('You are not a member');
    expect(db.workspaceMessage.create).not.toHaveBeenCalled();
  });

  it('allows only admins and developers to broadcast', async () => {
    const { chat, db } = fixture();
    await expect(chat.broadcast(alice, { subject: 'Update', content: 'Hello everyone' })).rejects.toThrow('Only Admin or Developer');
    await chat.broadcast(developer, { subject: 'Update', content: 'Hello everyone' });
    expect(db.workspaceBroadcastRecipient.create).toHaveBeenCalledTimes(2);
  });
});
