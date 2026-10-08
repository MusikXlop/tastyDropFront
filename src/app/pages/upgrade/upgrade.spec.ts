import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpgradeComponent } from './upgrade';

describe('UpgradeComponent', () => {
  let component: UpgradeComponent;
  let fixture: ComponentFixture<UpgradeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpgradeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UpgradeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
