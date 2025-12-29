// src/index.ts

import 'dotenv/config';
import type patient = require('./models/patient');
import apiResponse = require('./models/api-response');
import fetchResult = require('./models/fetch-result');
import { writeFileSync } from 'fs';
import { calculateRiskScore } from './risk-scoring';
import { generatePatientSummary } from './api-summary';

const API_KEY = process.env.API_KEY!;
const API_BASE = 'https://assessment.ksensetech.com/api/patients'; // Replace with actual endpoint

async function fetchPageWithRetry(page: number, maxRetries = 3, limit = 5): Promise<fetchResult.FetchResult> {
  const t = parseInt(process.env.RETRY_TIMEOUT || '3000', 10); // Base timeout in ms
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE}?page=${page}&limit=${limit}`, {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
      });

      // Handle rate limiting
      if (response.status === 429) {

        const delay = t * Math.pow(2, attempt); // 2s, 4s, 8s
        console.log(`429 on page ${page}, attempt ${attempt}/${maxRetries}. Waiting ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (attempt === maxRetries) {
          console.error(`Page ${page} FINAL FAIL (${response.status}): ${errorText}`);
          return { page, data: [], success: false, pagination: null };
        }
        const delay = t * attempt; // 2s, 4s, 6s for other errors
        console.log(`Page ${page} attempt ${attempt} failed (${response.status}). Retry in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      const json = await response.json();
      if (!Array.isArray(json.data)) {
        throw new Error(`Invalid data array on page ${page}`);
      }

      return { page, data: json.data, success: true, pagination: json.pagination };
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Page ${page} network error:`, error);
        return { page, data: [], success: false, pagination: null };
      }
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  return { page, data: [], success: false, pagination: null };
}

async function fetchAllPatients(): Promise<patient.Patient[]> {
  let allPatients: patient.Patient[] = [];
  const failedPages: number[] = [];
  let page = 1;
  let hasMorePages = true;
  let totalPages = 0;
  const maxRetries = 3;
  const limit = 5;

  console.log('=== FIRST PASS ===');

  // Fetch page 1 to discover pagination info
  let firstResponse: apiResponse.ApiResponse | null = null;

  while (hasMorePages) {
    const result = await fetchPageWithRetry(page, maxRetries, limit);

    if (result.success && result.data.length > 0) {
      totalPages = result.pagination?.totalPages || 0;
      allPatients.push(...result.data);
      //  On first successful page, read pagination info
      console.log(`✓ Page ${page}: ${result.data.length} patients (total: ${allPatients.length}/${result.pagination?.total})`);
      await new Promise(r => setTimeout(r, 500)); // Steady rate

      console.log(`Has more pages check: current page ${page}, total pages ${result.pagination?.totalPages}, ${result.pagination?.hasNext}`);

    } else {
      failedPages.push(page);
      console.log(`✗ Page ${page} failed - will retry`, result.pagination?.totalPages);
    }

    if (page > (totalPages || 0)) {
      break;
    }
    page++;
  }

  // Second pass: retry failed pages
  if (failedPages.length > 0) {
    console.log('\n=== RETRY PASS ===');
    for (const page of failedPages) {
      const result = await fetchPageWithRetry(page, 2); // Fewer retries on second pass
      if (result.success) {
        allPatients.push(...result.data);
        console.log(`✓ RETRY Page ${page}: ${result.data.length} patients`);
      } else {
        console.log(`✗ RETRY Page ${page} still failed`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\nFINAL: ${allPatients.length}/47 patients fetched`);
  return allPatients;
}


async function main() {
  try {
    const allPatients = await fetchAllPatients();
    const patientsWithRisk = allPatients.map(calculateRiskScore);

    // Generate the exact output format
    const summary = generatePatientSummary(patientsWithRisk);

    console.log('\n📋 Ksense Tech Assessment Output:');
    console.log(JSON.stringify(summary, null, 2));

    // Save to JSON file for Angular app
    writeFileSync('all-patients.json', JSON.stringify(allPatients, null, 2));
    writeFileSync('summary-2.json', JSON.stringify(summary, null, 2));
    console.log('- Saved to all-patients.json');

  } catch (error) {
    console.error('Script failed:', error);
  }
}


main();
