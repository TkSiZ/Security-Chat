import { TestBed } from '@angular/core/testing';

import { TripledesService } from './tripledes-service';

describe('TripledesService', () => {
  let service: TripledesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TripledesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
