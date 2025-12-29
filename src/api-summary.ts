import { ApiSummary } from "./models/api-summary";
import { parseBloodPressure, PatientWithRisk } from "./risk-scoring";



function generatePatientSummary(patientsWithRisk: PatientWithRisk[]): ApiSummary {
  const highRiskPatients: string[] = [];
  const feverPatients: string[] = [];
  const dataQualityIssues: string[] = [];

  patientsWithRisk.forEach(patient => {
    const patientId = patient.patient_id;
    
    // High risk: total score >= 4
    if (patient.riskScore >= 4) {
      highRiskPatients.push(patientId);
    }
    
    // Fever patients: temperature > 99.5
    if (patient.temperature > 99.5) {
      feverPatients.push(patientId);
    }
    
    // Data quality issues: invalid BP OR invalid age OR invalid temp
    const bpParsed = parseBloodPressure(patient.blood_pressure);
    const hasDataIssues = 
      bpParsed.systolic === null || bpParsed.diastolic === null ||  // Invalid BP
      isNaN(patient.age) || patient.age === null ||                // Invalid age
      isNaN(patient.temperature) || patient.temperature === null;  // Invalid temp
    
    if (hasDataIssues) {
      dataQualityIssues.push(patientId);
    }
  });

  return {
    high_risk_patients: highRiskPatients.sort(),
    fever_patients: feverPatients.sort(),
    data_quality_issues: dataQualityIssues.sort()
  };
}

export { generatePatientSummary };