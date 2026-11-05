import { CasesService } from './cases.service';

describe('lawyer case directory access', () => {
  const cases = [
    { id: 'own-team', litigationTeam: 'TEAM ALPHA', lawyerId: 'lawyer' },
    { id: 'other-team', litigationTeam: 'TEAM ANCHOR', lawyerId: 'lawyer' },
    { id: 'unassigned', litigationTeam: null, lawyerId: 'lawyer' },
  ];
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'lawyer', email: 'lawyer@example.com', litigationTeam: 'TEAM ANCHOR' }) },
    workspaceUser: { findUnique: jest.fn() },
    case: { findMany: jest.fn().mockResolvedValue(cases) },
  };
  const service = new CasesService(prisma, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('returns only the team assigned in the workspace, even for directly assigned cases', async () => {
    prisma.workspaceUser.findUnique.mockResolvedValue({ active: true, grants: { 'legal-staff': 'USER' }, litigationTeam: 'TEAM ALPHA' });
    expect((await service.findByLawyer('lawyer')).map((item: any) => item.id)).toEqual(['own-team']);
  });

  it('returns no cases after an admin removes the team assignment', async () => {
    prisma.workspaceUser.findUnique.mockResolvedValue({ active: true, grants: { 'legal-staff': 'USER' }, litigationTeam: null });
    expect(await service.findByLawyer('lawyer')).toEqual([]);
    expect(prisma.case.findMany).not.toHaveBeenCalled();
  });

  it('returns no cases when the workspace grant is revoked', async () => {
    prisma.workspaceUser.findUnique.mockResolvedValue({ active: true, grants: {}, litigationTeam: 'TEAM ALPHA' });
    expect(await service.findByLawyer('lawyer')).toEqual([]);
  });
});
