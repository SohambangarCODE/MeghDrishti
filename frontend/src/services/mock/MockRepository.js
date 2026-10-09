import fixture from '../../fixtures/reference.json';
import { validateDataset } from '../../schemas/contracts.js';
export class MockRepository {
  mode='demo';
  async load() {const value=structuredClone(fixture);validateDataset(value.dataset);return value;}
  async status() {return {Sectivia:'not supplied','Open-Meteo':'not configured','World Bank CCKP':'not supplied',Supabase:'not configured',Gemini:'not configured'};}
}
