import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopUpModalComponent } from './top-up-modal';

describe('TopUpModalComponent', () => {
  let component: TopUpModalComponent;
  let fixture: ComponentFixture<TopUpModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopUpModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TopUpModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
