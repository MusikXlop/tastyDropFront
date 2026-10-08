import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MinesComponent } from './mines.component';

describe('MinesComponent', () => {
  let component: MinesComponent;
  let fixture: ComponentFixture<MinesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MinesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MinesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
