interface Patient {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  blood_pressure: string;
  temperature: number;
  visit_date: string;
  diagnosis: string;
  medications: string;

}

export type { Patient };