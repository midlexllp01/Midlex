import { DirectoryService } from './directory.service';

describe('Litigation team assignments', () => {
  let db: any;
  let service: DirectoryService;
  let directory: any;
  const approved = { id: 'approved', email: 'lawyer@example.com', name: 'Counsel', role: 'STAFF', active: true, grants: { 'legal-staff': 'USER' } };

  beforeEach(() => {
    directory = { id: 'settings', teams: ['TEAM ANCHOR', 'RETAINER ADVISORY TEAM'], courts: [] };
    db = {
      directory: { findUnique: jest.fn().mockImplementation(async () => directory), update: jest.fn().mockImplementation(async ({ data }) => { directory = { ...directory, ...data }; return directory; }) },
      workspaceUser: { findMany: jest.fn().mockResolvedValue([approved, { ...approved, id: 'unapproved', grants: {} }, { ...approved, id: 'suspended', active: false }]), findUnique: jest.fn().mockResolvedValue(approved) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'legacy', email: approved.email }), update: jest.fn() },
      mutateWorkspaceUser: jest.fn().mockImplementation(async (_id, change) => ({ ...approved, ...change(approved) })),
    };
    service = new DirectoryService(db);
    jest.spyOn(service as any, 'saveToFile').mockImplementation(() => undefined);
  });

  it('shows only approved, active Counsel Workspace users', async () => {
    expect(await service.eligibleLitigationLawyers()).toEqual([{ id: approved.id, name: approved.name, email: approved.email, litigationTeam: null }]);
  });

  it('creates a persistent litigation team and excludes general teams', async () => {
    expect(await service.createLitigationTeam('Commercial Disputes')).toEqual(['TEAM ANCHOR', 'COMMERCIAL DISPUTES']);
    expect(db.directory.update).toHaveBeenCalledWith(expect.objectContaining({ data: { teams: ['TEAM ANCHOR', 'RETAINER ADVISORY TEAM', 'COMMERCIAL DISPUTES'] } }));
  });

  it('saves team assignment to workspace identity and legacy case membership', async () => {
    expect(await service.assignLitigationLawyer(approved.id, 'TEAM ANCHOR')).toMatchObject({ litigationTeam: 'TEAM ANCHOR' });
    expect(db.mutateWorkspaceUser).toHaveBeenCalledWith(approved.id, expect.any(Function));
    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { litigationTeam: 'TEAM ANCHOR', department: 'LITIGATION' } }));
  });

  it('rejects an unapproved lawyer before saving membership', async () => {
    db.workspaceUser.findUnique.mockResolvedValue({ ...approved, grants: {} });
    await expect(service.assignLitigationLawyer(approved.id, 'TEAM ANCHOR')).rejects.toThrow('no active Counsel Workspace grant');
    expect(db.mutateWorkspaceUser).not.toHaveBeenCalled();
  });

  it('rejects an unknown team before saving membership', async () => {
    await expect(service.assignLitigationLawyer(approved.id, 'UNKNOWN')).rejects.toThrow('existing litigation team');
    expect(db.mutateWorkspaceUser).not.toHaveBeenCalled();
  });
});
