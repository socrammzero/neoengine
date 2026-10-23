/*
 * Especificación de Laboratorio — Tema 3_1 (Págs. 101-108): Lectores/Escritores Justo para Escritores
 * Compilación: gcc -Wall -Wextra -std=c11 -pthread lectores_escritores_sem.c -o lectores_escritores_sem -lrt
 * Usa 5 semáforos binarios (escribiendo, leyendo, mutex1, mutex2, mutex3) para garantizar
 * que ningún lector adelante a un escritor que ya está esperando en leyendo.
 */

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <semaphore.h>

#define MAXL 3
#define MAXE 2

int nLectores = 0;
int nEscritores = 0;

sem_t escribiendo;
sem_t leyendo;
sem_t mutex1;
sem_t mutex2;
sem_t mutex3;

void entraLector(void) {
    sem_wait(&mutex3);
    sem_wait(&leyendo);
    sem_wait(&mutex1);
    nLectores++;
    if (nLectores == 1) {
        sem_wait(&escribiendo);
    }
    sem_post(&mutex1);
    sem_post(&leyendo);
    sem_post(&mutex3);
}

void saleLector(void) {
    sem_wait(&mutex1);
    nLectores--;
    if (nLectores == 0) {
        sem_post(&escribiendo);
    }
    sem_post(&mutex1);
}

void entraEscritor(void) {
    sem_wait(&mutex2);
    nEscritores++;
    if (nEscritores == 1) {
        sem_wait(&leyendo);
    }
    sem_post(&mutex2);
    sem_wait(&escribiendo);
}

void saleEscritor(void) {
    sem_wait(&mutex2);
    nEscritores--;
    if (nEscritores == 0) {
        sem_post(&leyendo);
    }
    sem_post(&mutex2);
    sem_post(&escribiendo);
}

void *Lector(void *param) {
    int id = *(int *)param;
    entraLector();
    printf("[Lector %d] Leyendo Base de Datos...\n", id);
    saleLector();
    pthread_exit(NULL);
}

void *Escritor(void *param) {
    int id = *(int *)param;
    entraEscritor();
    printf("[Escritor %d] Actualizando Base de Datos en exclusion mutua...\n", id);
    saleEscritor();
    pthread_exit(NULL);
}

int main(void) {
    pthread_t thL[MAXL], thE[MAXE];
    int idL[MAXL], idE[MAXE];
    int i;

    sem_init(&escribiendo, 0, 1);
    sem_init(&leyendo, 0, 1);
    sem_init(&mutex1, 0, 1);
    sem_init(&mutex2, 0, 1);
    sem_init(&mutex3, 0, 1);

    for (i = 0; i < MAXL; i++) {
        idL[i] = i;
        if (pthread_create(&thL[i], NULL, Lector, &idL[i]) != 0) {
            perror("Error en pthread_create Lector: ");
            exit(-1);
        }
    }

    for (i = 0; i < MAXE; i++) {
        idE[i] = i;
        if (pthread_create(&thE[i], NULL, Escritor, &idE[i]) != 0) {
            perror("Error en pthread_create Escritor: ");
            exit(-1);
        }
    }

    for (i = 0; i < MAXL; i++) {
        if (pthread_join(thL[i], NULL) != 0) {
            perror("Error en pthread_join Lector: ");
            exit(-1);
        }
    }

    for (i = 0; i < MAXE; i++) {
        if (pthread_join(thE[i], NULL) != 0) {
            perror("Error en pthread_join Escritor: ");
            exit(-1);
        }
    }

    return 0;
}
