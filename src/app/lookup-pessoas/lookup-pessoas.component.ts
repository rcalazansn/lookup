import { Component, OnInit } from '@angular/core';
import { distinctUntilChanged, debounceTime, switchMap, tap, catchError } from 'rxjs/operators'
import { Subject, Observable, } from 'rxjs';
import { of } from 'rxjs/observable/of';
import { concat } from 'rxjs/observable/concat';

@Component({
    selector: 'app-lookup-pessoas',
    templateUrl: './lookup-pessoas.component.html'
})
export class LookupPessoasComponent implements OnInit {

    ListaPessoasAssync: Observable<Person[]>;
    people3Loading = false;
    people3input$ = new Subject<string>();
    selectedLookupFiltroMultiple: any[];
    selectedLookupFiltroSigle: any;

    ListaPessoas: Person[];
    selectedLookupMultiple: any;
    selectedLookupSigle: any;

    itemsFull: Person[];
    constructor() { }

    ngOnInit() {
        //para Pesquisar assync
        this.itemsFull = this.RetornaListaPessoas();
        this.preprarBuscaPessoa();

        this.ListaPessoas = this.RetornaListaPessoas();       

        //Setar Valor padrão e/ou vindo do banco no caso de editar/visualizar
        this.selectedLookupFiltroMultiple = this.itemsFull.filter(a => a.id >= 5); //Felipe, Patricia e Eduardo
        this.selectedLookupFiltroSigle = this.itemsFull.filter(a => a.id == 3)[0] //Caio

        this.selectedLookupSigle = 5;//Felipe
        this.selectedLookupMultiple = [2, 6]; //Carlo e Patricia
    }

    obterPessoas(term: string = null): Observable<Person[]> {
        let listaLocal;

        if (term.length >= 3) {
            listaLocal = this.itemsFull.filter(x => x.nome.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()) > -1);
        }
        return of(listaLocal);
    }

    showModal() {
        console.log('Show Filter');
    }

    RetornaListaPessoas(): Person[] {
        return [
            {
                'id': 1,
                'nome': 'Amanda'
            },
            {
                'id': 2,
                'nome': 'Carlos'
            },
            {
                'id': 3,
                'nome': 'Caio'
            },
            {
                'id': 4,
                'nome': 'Luiz'
            },
            {
                'id': 5,
                'nome': 'Felipe'
            },
            {
                'id': 6,
                'nome': 'Patricia'
            },
            {
                'id': 7,
                'nome': 'Eduardo'
            }
        ]
    }

    private preprarBuscaPessoa() {
        this.ListaPessoasAssync = concat(
            of([]),
            this.people3input$.pipe(
                debounceTime(200),
                distinctUntilChanged(),
                tap(() => this.people3Loading = true),
                switchMap(term => this.obterPessoas(term).pipe(
                    catchError(() => of([])),
                    tap(() => this.people3Loading = false)
                ))
            )
        );
    }
}

export interface Person {
    id: number;
    nome: string;
}