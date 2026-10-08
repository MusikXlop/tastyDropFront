import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BattlePassComponent } from './battle-pass';

describe('BattlePassComponent', () => {
  let component: BattlePassComponent;
  let fixture: ComponentFixture<BattlePassComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BattlePassComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BattlePassComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
