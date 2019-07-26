import { Component, OnInit, Input, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { SearchService } from 'src/app/services/search.service';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-fundings',
  templateUrl: './fundings.component.html',
  styleUrls: ['./fundings.component.scss']
})
export class FundingsComponent implements OnInit, OnDestroy {
  @Input() fundingData: any [];
  @Input() tabData: string;
  expandStatus: Array<boolean> = [];
  errorMessage = [];
  @ViewChild('singleId') singleId: ElementRef;
  @ViewChild('srHeader') srHeader: ElementRef;

  constructor( private searchService: SearchService, private route: ActivatedRoute ) {
  }

  ngOnInit() {
  }

  // Assign results to fundingData
  getFundingData() {
    this.searchService.getAllResults()
    .pipe(map(fundingData => [fundingData]))
    .subscribe(fundingData => {
      this.fundingData = fundingData;
    },
      error => this.errorMessage = error as any);
  }

  ngOnDestroy() {
  }
}
