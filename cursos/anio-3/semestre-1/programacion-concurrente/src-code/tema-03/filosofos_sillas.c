/*
 * Especificación de Laboratorio — Tema 3_1 (Págs. 109-115): Cena de los Filósofos sin Deadlock
 * Compilación: gcc -Wall -Wextra -std=c11 -pthread filosofos_sillas.c -o filosofos_sillas -lrt
 * Solución con semáforo general 'sillas' inicializado a MAXF - 1 (= 4) para impedir la espera circular.
 */

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <semaphore.h>

#define MAXF 5

sem_t ten[MAXF];
sem_t sillas;

void *HebraF(void *argg) {
    int id = *(int *)argg;

    sem_wait(&sillas);
    sem_wait(&ten[id]);
    sem_wait(&ten[(id + 1) % MAXF]);

    printf("[Filosofo %d] Comiendo con tenedores %d y %d\n", id, id, (id + 1) % MAXF);

    sem_post(&ten[(id + 1) % MAXF]);
    sem_post(&ten[id]);
    sem_post(&sillas);

    printf("[Filosofo %d] Termina de comer y vuelve a pensar\n", id);
    pthread_exit(NULL);
}

int main(void) {
    pthread_t th[MAXF];
    int id[MAXF];
    int i;

    sem_init(&sillas, 0, MAXF - 1);
    for (i = 0; i < MAXF; i++) {
        sem_init(&ten[i], 0, 1);
    }

    for (i = 0; i < MAXF; i++) {
        id[i] = i;
        if (pthread_create(&th[i], NULL, HebraF, &id[i]) != 0) {
            perror("Error en pthread_create Filosofo: ");
            exit(-1);
        }
    }

    for (i = 0; i < MAXF; i++) {
        if (pthread_join(th[i], NULL) != 0) {
            perror("Error en pthread_join Filosofo: ");
            exit(-1);
        }
    }

    return 0;
}
