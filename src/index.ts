// src/index.ts

import 'dotenv/config';
import type patient = require('./models/patient');
import apiResponse = require('./models/api-response');

const API_KEY = process.env.API_KEY!;
const API_BASE = 'https://assessment.ksensetech.com/api/patients'; // Replace with actual endpoint


// async function fetchAllPatients(): Promise<patient.Patient[]> {
//   let allPatients: patient.Patient[] = [];
//   let page = 1;
//   let hasNext = true;

//   while (hasNext) {
//     const patientsPerPage = 5;
//     const response = await fetch(`${API_BASE}?page=${page}&limit=${patientsPerPage}`, {
//       headers: {
//         'x-api-key': API_KEY,
//         'Content-Type': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       throw new Error(`Page ${page} failed: ${response.status}`);
//     }

//     const apiResponse: apiResponse.ApiResponse = await response.json();
//     console.log(`API RESPONSE PAGE ${page}:`, JSON.stringify(apiResponse, null, 2));
//     allPatients.push(...apiResponse.data);
    
//     page++;
//     hasNext = apiResponse.pagination.hasNext;
    
//     console.log(`Fetched page ${page-1}: ${apiResponse.data.length} patients (total: ${allPatients.length}/${apiResponse.pagination.total})`);
//   }

//   return allPatients;
// }

async function fetchPage(page: number): Promise<apiResponse.ApiResponse> {
  const patientsPerPage = 5;
  const response = await fetch(`${API_BASE}?page=${page}&limit=${patientsPerPage}`, {
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 429) {
    console.log(`Rate limited on page ${page}. Waiting 2s...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return fetchPage(page); // Retry once
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Page ${page} failed (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  
  // Validate the response shape
  if (!json || !Array.isArray(json.data)) {
    throw new Error(`Page ${page}: Invalid response - no data array: ${JSON.stringify(json)}`);
  }

  return json as apiResponse.ApiResponse;
}

async function fetchAllPatients(): Promise<patient.Patient[]> {
  let allPatients: patient.Patient[] = [];
  let page = 1;
  const maxPages = 10;
  let totalPatients = 0;

  while (page <= maxPages) { // Use totalPages instead of hasNext
    try {
      console.log(`Fetching page ${page}...`);
      const apiResponse: apiResponse.ApiResponse = await fetchPage(page);
      allPatients.push(...apiResponse.data);
      
      console.log(`Page ${page}: ${apiResponse.data.length} patients (total: ${allPatients.length}/${apiResponse.pagination.total})`);
      totalPatients = apiResponse.pagination.total;

      if (allPatients.length >= totalPatients) {
        console.log('All patients fetched.');
        break;
      }
      // Rate limiting: 1s delay between pages
      if (page < apiResponse.pagination.totalPages) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      page++;
    } catch (error) {
      console.error(`Page ${page} failed:`, error);
      // Continue to next page instead of breaking
      page++;
    }
  }

  console.log(`\nCompleted. Fetched ${allPatients.length}/${totalPatients} patients`);
  return allPatients;
}


async function main() {
  try {
    const allPatients = await fetchAllPatients();
    console.log('ALL PATIENTS:', JSON.stringify(allPatients, null, 2));
    console.log(`\nTotal patients fetched: ${allPatients.length}`);
    
    // Example: Filter high temperature patients
    const feverPatients = allPatients.filter(p => p.temperature > 100);
    console.log('\nFever patients:', feverPatients.map(p => p.name));
    
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}

main();
