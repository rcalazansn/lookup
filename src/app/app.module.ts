import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { LookupPessoasComponent } from './lookup-pessoas/lookup-pessoas.component';

import { NgSelectModule } from './ng-select/ng-select.module';
import { NG_SELECT_DEFAULT_CONFIG } from './ng-select/ng-select.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    LookupPessoasComponent,
  ],
  imports: [
    BrowserModule,
    NgSelectModule,
    FormsModule
  ],
  providers: [{
    provide: NG_SELECT_DEFAULT_CONFIG,
      useValue: {
        notFoundText: 'Nenhum registro encontrado'
      }
  }],
  bootstrap: [AppComponent]
})
export class AppModule { }
