import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaseDetailsComponent } from './case-details.component';

describe('CaseDetailsComponent', () => {
  let component: CaseDetailsComponent;
  let fixture: ComponentFixture<CaseDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaseDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CaseDetailsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
