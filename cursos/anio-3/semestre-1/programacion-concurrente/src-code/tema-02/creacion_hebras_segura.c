/*
 * Patrón Canónico Oficial (INFO.md Sección 3.1) — Tema 2: Gestión Segura de Hebras Pthreads
 * Compilación: gcc -Wall -Wextra -std=c11 -pthread creacion_hebras_segura.c -o creacion_hebras_segura -lrt
 * Reglas cumplidas:
 *  - Uso obligatorio de int ids[NUM_HEBRAS] con ids[i] = i y paso de &ids[i].
 *  - Comprobación obligatoria de retorno de pthread_create y pthread_join.
 *  - Variables estándar sin calificadores prohibidos.
 */

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

#define NUM_HEBRAS 4

void *HTarea(void *param) {
    int miId = *(int *)param;
    printf("Hebra %d en ejecucion\n", miId);
    pthread_exit(NULL);
}

int main(void) {
    pthread_t hebras[NUM_HEBRAS];
    int ids[NUM_HEBRAS];
    int i;

    for (i = 0; i < NUM_HEBRAS; i++) {
        ids[i] = i;
        if (pthread_create(&hebras[i], NULL, HTarea, &ids[i]) != 0) {
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

    printf("Todas las hebras han concluido.\n");
    return 0;
}
