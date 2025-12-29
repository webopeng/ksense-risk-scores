import { writeFileSync } from "fs";
import { Patient } from "./models/patient";

interface PatientWithRisk extends Patient {
  riskScore: number;
  bpScore: number;
  tempScore: number;
  ageScore: number;
}

function parseBloodPressure(bp: string): { systolic: number | null; diastolic: number | null } {
  if (!bp || bp === 'N/A' || bp.includes('INVALID')) return { systolic: null, diastolic: null };
  
  const match = bp.match(/^(\d+)\/(\d+)$/);
  if (!match) return { systolic: null, diastolic: null };
  
  if (match[1]==undefined || match[2]==undefined) return { systolic: null, diastolic: null };
  const systolic = parseInt(match[1], 10);
  const diastolic = parseInt(match[2], 10);
  
  return { systolic: isNaN(systolic) ? null : systolic, diastolic: isNaN(diastolic) ? null : diastolic };
}

function getBloodPressureScore(bp: string): number {
  const { systolic, diastolic } = parseBloodPressure(bp);
  if (systolic === null || diastolic === null) return 0;
  
  // Use higher risk of the two
  const systolicRisk = systolic < 120 ? 0 : systolic <= 129 ? 1 : systolic <= 139 ? 2 : 3;
  const diastolicRisk = diastolic < 80 ? 0 : diastolic <= 89 ? 2 : 3;
  
  return Math.max(systolicRisk, diastolicRisk);
}

function getTemperatureScore(temp: number): number {
  if (isNaN(temp) || temp === null) return 0;
  return temp <= 99.5 ? 0 : temp <= 100.9 ? 1 : 2;
}

function getAgeScore(age: number): number {
  if (isNaN(age) || age === null) return 0;
  return age < 40 ? 0 : age <= 65 ? 1 : 2;
}

function calculateRiskScore(patient: Patient): PatientWithRisk {
  const bpScore = getBloodPressureScore(patient.blood_pressure);
  const tempScore = getTemperatureScore(patient.temperature);
  const ageScore = getAgeScore(patient.age);

  console.log('fever-patients.json', JSON.stringify(`${patient.patient_id}, [${patient.temperature}], ${tempScore}`, null, 2));

  return {
    ...patient,
    riskScore: bpScore + tempScore + ageScore,
    bpScore,
    tempScore,
    ageScore
  };
}
export { calculateRiskScore, type PatientWithRisk, parseBloodPressure };