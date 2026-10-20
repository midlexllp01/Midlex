import { Router, Request, Response } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

// GET monthly payroll calculations and summary
router.get('/summary', (req: Request, res: Response) => {
  const db = getDb();

  const staffPayroll = db.staff.map((s) => {
    const verifiedAppearances = db.courtAppearances.filter(
      (c) => c.counselId === s.id && c.status === 'VERIFIED'
    );
    const courtAllowanceTotal = verifiedAppearances.reduce((acc, curr) => acc + curr.dailyRate, 0);

    const grossSalary = s.basicSalary + courtAllowanceTotal;
    const pensionDeduction = Math.round(s.basicSalary * 0.08); // 8% Pension
    const taxDeduction = Math.round(s.basicSalary * 0.07); // 7% PAYE
    const totalDeductions = pensionDeduction + taxDeduction;
    const netSalary = grossSalary - totalDeductions;

    return {
      staffId: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      department: s.department,
      staffCategory: s.staffCategory,
      basicSalary: s.basicSalary,
      courtAppearanceCount: verifiedAppearances.length,
      courtAllowanceTotal,
      grossSalary,
      pensionDeduction,
      taxDeduction,
      totalDeductions,
      netSalary,
    };
  });

  const totalBaseSalary = db.staff.reduce((acc, s) => acc + s.basicSalary, 0);
  const totalCourtAllowances = staffPayroll.reduce((acc, s) => acc + s.courtAllowanceTotal, 0);
  const totalGrossPayout = totalBaseSalary + totalCourtAllowances;
  const totalNetPayout = staffPayroll.reduce((acc, s) => acc + s.netSalary, 0);

  res.json({
    success: true,
    data: {
      totalBaseSalary,
      totalCourtAllowances,
      totalGrossPayout,
      totalNetPayout,
      staffCount: db.staff.length,
      payrollEntries: staffPayroll,
    },
  });
});

export default router;
