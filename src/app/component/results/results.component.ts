//  This file is part of the research.fi API service
//
//  Copyright 2019 Ministry of Education and Culture, Finland
//
//  :author: CSC - IT Center for Science Ltd., Espoo Finland servicedesk@csc.fi
//  :license: MIT

import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SearchService } from '../../services/search.service';
import { map } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit, OnDestroy {
  public searchTerm: any;
  public urlPageNumber: number;
  input: any = [];
  publicationData: any [];
  responseData: any [];
  personData: any [];
  fundingData: any [];
  errorMessage = [];
  fromPage = 0;
  pageNumber = 1;
  page = 1;
  expandStatus: Array<boolean> = [];
  @ViewChild('singleId') singleId: ElementRef;
  @ViewChild('srHeader') srHeader: ElementRef;

  constructor( private searchService: SearchService, private route: ActivatedRoute, private router: Router, private titleService: Title ) {
    this.searchTerm = this.route.snapshot.params.input;
    this.searchService.getInput(this.searchTerm);
    this.urlPageNumber = this.route.snapshot.params.page;
    this.publicationData = [];
    // Get page number from local storage
    this.pageNumber = JSON.parse(localStorage.getItem('Pagenumber'));
    this.searchService.getPageNumber(this.urlPageNumber);

    if (this.urlPageNumber === undefined) {
      this.urlPageNumber = 1;
    }
    console.log(this.urlPageNumber);
  }

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    // Subscribe to route input parameter, works with browser back & forward buttons
    this.input = this.route.params.subscribe(params => {
      const term = params.input;
      this.searchTerm = term;
      this.searchService.getInput(this.searchTerm);
      // Get data
      // if (this.urlPageNumber === 1) {
      //   this.getAllData();
      // }
      this.getAllData();
    });

    // Reset pagination
    this.page = this.searchService.pageNumber;

    // If url is missing search term, might not be necessary
    if (this.searchTerm === undefined) {
      this.searchTerm = '';
    }

    // Pagination number
    this.fromPage = this.page * 10 - 10;

    // Needs to detect when coming back to page different than first
    if (this.fromPage >= 1) {
      this.getPublicationData();
    }


    // Listen for search button action on results page
    if (this.input !== null || this.searchService.subsVar === undefined) {
      this.searchService.subsVar = this.searchService.
      invokeGetData.subscribe(() => {
        // Reset pagination
        this.fromPage = 0;
        this.page = 1;
        this.searchService.getPageNumber(1);
      });
    }
  }

  getAllData() {
    this.searchService.getAllResults()
    .pipe(map(responseData => [responseData]))
    .subscribe(responseData => {
      this.responseData = responseData;
      // Set the title, pass a MatTabChange-like mock object to updateTitle() to avoid duplicate code 
      this.updateTitle({tab: {textLabel: 'Julkaisut (' + this.responseData[0].hits.total + ')'}});
    },
      error => this.errorMessage = error as any);
  }

  getPublicationData() {
    this.searchService.getPublications()
    .pipe(map(publicationData => [publicationData]))
    .subscribe(publicationData => {
      this.publicationData = publicationData;
      // Set the title, pass a MatTabChange-like mock object to updateTitle() to avoid duplicate code 
      this.updateTitle({tab: {textLabel: 'Julkaisut (' + this.publicationData[0].hits.total + ')'}});
    },
      error => this.errorMessage = error as any);
  }

  getPersonData() {
    this.searchService.getPersons()
    .pipe(map(personData => [personData]))
    .subscribe(personData => this.personData = personData,
      error => this.errorMessage = error as any);
  }

  getFundingData() {
    this.searchService.getFundings()
    .pipe(map(fundingData => [fundingData]))
    .subscribe(fundingData => this.fundingData = fundingData,
      error => this.errorMessage = error as any);
  }

  nextPage() {
    this.page++;
    this.fromPage = this.page * 10 - 10;
    // Set page number to local storage
    localStorage.setItem('Pagenumber', JSON.stringify(this.page));
    // Send to search service
    this.searchService.getPageNumber(this.page);
    this.searchTerm = this.route.snapshot.params.input;
    this.router.navigate(['results/', this.searchTerm, this.page]);
    this.getPublicationData();
  }

  previousPage() {
    this.page--;
    this.fromPage = this.fromPage - 10;
    localStorage.setItem('Pagenumber', JSON.stringify(this.page));
    this.searchService.getPageNumber(this.page);
    this.searchTerm = this.route.snapshot.params.input;
    this.router.navigate(['results/', this.searchTerm, this.page]);
    this.getPublicationData();
  }

  updateTitle(event: { tab: any; }) {
    // Update title and <h1> with the information of the currently selected tab
    // Regex to match the bracketed numbers
    const re: RegExp = /\((\d*)\)/;
    this.setTitle(event.tab.textLabel.replace(re, ' - ($1 hakutulosta)') + ' - Haku - Tutkimustietovaranto');
    this.srHeader.nativeElement.innerHTML = document.title.split(' - ', 2).join(' - ');
  }

  // Unsubscribe from search term to prevent memory leaks
  ngOnDestroy() {
    this.searchService.subsVar.unsubscribe();
  }

}
