import * as roamService from './src/api/roam-service-json';

console.log('Initializing ROAM...');
roamService.initializeDatabase();

console.log('Creating test risk...');
const id = roamService.createROAM({
  type: 'risk',
  title: 'Test Risk',
  owner_circle: 'orchestrator',
  details: 'This is a test',
});

console.log(`Created risk with ID: ${id}`);

console.log('Getting summary...');
const summary = roamService.getROAMSummary();
console.log('ROAM Summary:', JSON.stringify(summary, null, 2));

console.log('Getting all entities...');
const all = roamService.getAllROAM();
console.log(`Total entities: ${all.length}`);

console.log('✅ ROAM JSON service works!');
