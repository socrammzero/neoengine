/*
 * Patrón Canónico Oficial (INFO.md Sección 3.3) — Tema 3: Algoritmo de la Panadería de Lamport (N Procesos)
 * Compilación: gcc -Wall -Wextra -std=c11 -pthread panaderia_lamport.c -o panaderia_lamport -lrt
 * Orden lexicográfico: (turno[i], i) < (turno[id], id)
 */

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

#define MAXT        5
#define ITERACIONES 1000

int cont = 0;
int pidiendoTurno[MAXT] = {0};
int turno[MAXT] = {0};

int siguiente(void) {
    int i, max = 0;
    for (i = 0; i < MAXT; i++) {
        if (turno[i] > max) {
            max = turno[i];
        }
    }
    return max + 1;
}

int meToca(int id, int i) {
    if (turno[i] > 0 && turno[i] < turno[id]) return 0;
    if (turno[i] == turno[id] && i < id) return 0;
    return 1;
}

void *Hebra(void *param) {
    int miId = *(int *)param;
    int i, j;

    for (i = 0; i < ITERACIONES; i++) {
        pidiendoTurno[miId] = 1;
        turno[miId] = siguiente();
        pidiendoTurno[miId] = 0;

        for (j = 0; j < MAXT; j++) {
            while (pidiendoTurno[j])
                ;
            while (!meToca(miId, j))
                ;
        }

        /* Sección Crítica */
        cont++;

        /* Postprotocolo */
        turno[miId] = 0;
    }

    pthread_exit(NULL);
}

int main(void) {
    pthread_t hebras[MAXT];
    int ids[MAXT];
    int i;

    for (i = 0; i < MAXT; i++) {
        ids[i] = i;
        if (pthread_create(&hebras[i], NULL, Hebra, &ids[i]) != 0) {
            perror("Error en pthread_create: ");
            exit(-1);
        }
    }

    for (i = 0; i < MAXT; i++) {
        if (pthread_join(hebras[i], NULL) != 0) {
            perror("Error en pthread_join: ");
            exit(-1);
        }
    }

    printf("Fin Panaderia. Visitantes cont = %d\n", cont);
    return 0;
}
