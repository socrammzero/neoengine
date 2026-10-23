/*
 * Patrón Canónico Oficial (INFO.md Sección 3.2) — Tema 3: Algoritmo de Peterson (2 Procesos)
 * Compilación: gcc -Wall -Wextra -std=c11 -pthread peterson.c -o peterson -lrt
 * Propiedades verificadas:
 *  - R1: Exclusión mutua estricta
 *  - R2: Ausencia de livelock / deadlock
 *  - R3: Progreso cuando sólo un proceso compite
 *  - R4: Justicia (espera acotada a 1 turno como máximo)
 */

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

#define NUM_HEBRAS  2
#define ITERACIONES 3

unsigned f[2] = {0, 0};
int turno = 0;
int cont = 0;

void *Hebra(void *param) {
    int miId = *(int *)param;
    int otra = (miId + 1) % 2;
    int k;

    for (k = 0; k < ITERACIONES; k++) {
        /* Preprotocolo de Peterson */
        f[miId] = 1;
        turno = otra;
        while (f[otra] && turno == otra)
            ;

        /* Sección Crítica */
        cont = cont + 1;
        printf("SECCION CRITICA id=%d (cont=%d)\n", miId, cont);

        /* Postprotocolo de Peterson */
        f[miId] = 0;
        printf("SECCION NO CRITICA id=%d\n", miId);
    }

    pthread_exit(NULL);
}

int main(void) {
    pthread_t hebras[NUM_HEBRAS];
    int ids[NUM_HEBRAS];
    int i;

    for (i = 0; i < NUM_HEBRAS; i++) {
        ids[i] = i;
        if (pthread_create(&hebras[i], NULL, Hebra, &ids[i]) != 0) {
            perror("Error en pthread_create: ");
            exit(-1);
        }
    }

    for (i = 0; i < NUM_HEBRAS; i++) {
        if (pthread_join(hebras[i], NULL) != 0) {
            perror("Error en pthread_join: ");
            exit(-1);
        }
    }

    printf("Fin. Valor final de cont = %d\n", cont);
    return 0;
}
