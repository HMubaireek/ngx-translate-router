import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LocalizeRouterModule } from '@hmubaireek/ngx-translate-router';

import { BobComponent } from './bob/bob.component';

const routes: Routes = [
  { path: '', component: BobComponent },
  { path: 'bob', component: BobComponent }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    LocalizeRouterModule.forChild(routes)
  ],
  exports: [RouterModule, LocalizeRouterModule]
})
export class TestRoutingModule { }
