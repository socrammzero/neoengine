/*
 * Especificación de Laboratorio — Tema 1: Búsqueda Lineal Concurrente
 * Compilación: gcc -Wall -Wextra -std=c11 -pthread busqueda_concurrente.c -o busqueda_concurrente -lrt
 * Cumplimiento estricto Normativa de Evaluación: Variables globales simples y comprobación obligatoria de pthread_create y pthread_join.
 */

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

#define TAM_ARRAY 10
#define OBJETIVO  7

int v[TAM_ARRAY];

struct argm {
    int x;
    int li;
    int lf;
};

void Rellenar(void) {
    int i;
    for (i = 0; i < TAM_ARRAY; i++) {
        v[i] = i;
    }
}

void *busquedaLineal(void *argg) {
    int i = 0, enc = 0;
    struct argm *arg = (struct argm *)argg;
    i = arg->li;

    while (i <= arg->lf && !enc) {
        if (v[i] == arg->x) {
            enc = 1;
        } else {
            i++;
        }
    }

    if (enc) {
        printf("Encontrado en pos = %d\n", i);
    }
    pthread_exit(NULL);
}

int main(void) {
    struct argm arg1, arg2;
    pthread_t th1, th2;

    Rellenar();

    arg1.li = 0;
    arg1.lf = 4;
    arg1.x = OBJETIVO;

    arg2.li = 5;
    arg2.lf = 9;
    arg2.x = OBJETIVO;

    if (pthread_create(&th1, NULL, busquedaLineal, &arg1) != 0) {
        perror("Error en pthread_create th1: ");
        exit(-1);
    }

    if (pthread_create(&th2, NULL, busquedaLineal, &arg2) != 0) {
        perror("Error en pthread_create th2: ");
        exit(-1);
    }

    if (pthread_join(th1, NULL) != 0) {
        perror("Error en pthread_join th1: ");
        exit(-1);
    }

    if (pthread_join(th2, NULL) != 0) {
        perror("Error en pthread_join th2: ");
        exit(-1);
    }

    printf("Fin\n");
    return 0;
}
