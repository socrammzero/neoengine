/*
 * Patrón Canónico Oficial (Normativa de Evaluación) — Tema 3_1: Productor/Consumidor con Semáforos POSIX
 * Compilación: gcc -Wall -Wextra -std=c11 -pthread productor_consumidor_sem.c -o productor_consumidor_sem -lrt
 * Directiva Crítica: Uso obligatorio de sem_t mutex con sem_wait(&mutex) y sem_post(&mutex).
 */

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <semaphore.h>

#define MAXT        5
#define TOTAL_DATOS 6

long Buffer[MAXT];

sem_t Hay_espacio;
sem_t Hay_Datos;
sem_t mutex;

void *Productor(void *param) {
    int i = 0;
    int dato = 0;
    int k;
    (void)param;

    for (k = 0; k < TOTAL_DATOS; k++) {
        sem_wait(&Hay_espacio);
        sem_wait(&mutex);
        Buffer[i] = dato;
        dato = (dato + 1) % 10000;
        i = (i + 1) % MAXT;
        sem_post(&mutex);
        sem_post(&Hay_Datos);
    }
    pthread_exit(NULL);
}

void *Consumidor(void *param) {
    int i = 0;
    int dato = 0;
    int k;
    (void)param;

    for (k = 0; k < TOTAL_DATOS; k++) {
        sem_wait(&Hay_Datos);
        sem_wait(&mutex);
        dato = (int)Buffer[i];
        i = (i + 1) % MAXT;
        sem_post(&mutex);
        sem_post(&Hay_espacio);
        printf("Dato Consumido = %d\n", dato);
    }
    pthread_exit(NULL);
}

int main(void) {
    pthread_t th1, th2;

    sem_init(&Hay_espacio, 0, MAXT);
    sem_init(&Hay_Datos, 0, 0);
    sem_init(&mutex, 0, 1);

    if (pthread_create(&th1, NULL, Productor, NULL) != 0) {
        perror("Error en pthread_create Productor: ");
        exit(-1);
    }
    if (pthread_create(&th2, NULL, Consumidor, NULL) != 0) {
        perror("Error en pthread_create Consumidor: ");
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

    sem_destroy(&Hay_espacio);
    sem_destroy(&Hay_Datos);
    sem_destroy(&mutex);

    printf("Fin\n");
    return 0;
}
