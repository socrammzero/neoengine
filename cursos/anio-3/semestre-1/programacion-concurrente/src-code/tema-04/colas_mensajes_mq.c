/*
 * Especificación de Laboratorio — Tema 4 (Págs. 14-34): Colas de Mensajes POSIX y Espera Selectiva
 * Compilación: gcc -Wall -Wextra -std=c11 -pthread colas_mensajes_mq.c -o colas_mensajes_mq -lrt
 * Implementa el Problema de los Jardines con 2 colas POSIX (<mqueue.h>) y multiplexación select().
 */

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <mqueue.h>
#include <sys/stat.h>
#include <sys/select.h>

#define MAX_MSG    10
#define VISITAS_P  1000

mqd_t cola[2];
long Visitantes = 0;

void *HebraVisitas(void *argg) {
    int idCola = *(int *)argg;
    int i, val = 1;
    unsigned int prio = 1;

    for (i = 0; i < VISITAS_P; i++) {
        if (mq_send(cola[idCola], (const char *)&val, sizeof(int), prio) == -1) {
            perror("Error en mq_send: ");
            exit(-1);
        }
    }
    pthread_exit(NULL);
}

void *IncVisitantesSelect(void *arg) {
    fd_set rfds;
    int recibidos = 0;
    int num = 0;
    unsigned int prior = 0;
    int maxfd;
    (void)arg;

    maxfd = (cola[0] > cola[1] ? cola[0] : cola[1]) + 1;

    while (recibidos < 2 * VISITAS_P) {
        FD_ZERO(&rfds);
        FD_SET(cola[0], &rfds);
        FD_SET(cola[1], &rfds);

        if (select(maxfd, &rfds, NULL, NULL, NULL) > 0) {
            if (FD_ISSET(cola[0], &rfds)) {
                if (mq_receive(cola[0], (char *)&num, sizeof(int), &prior) != -1) {
                    Visitantes += num;
                    recibidos++;
                }
            }
            if (FD_ISSET(cola[1], &rfds)) {
                if (mq_receive(cola[1], (char *)&num, sizeof(int), &prior) != -1) {
                    Visitantes += num;
                    recibidos++;
                }
            }
        }
    }
    pthread_exit(NULL);
}

int main(void) {
    pthread_t th1, th2, thSrv;
    int ids[2] = {0, 1};
    struct mq_attr attrq;

    attrq.mq_maxmsg = MAX_MSG;
    attrq.mq_msgsize = sizeof(int);
    attrq.mq_flags = 0;

    mq_unlink("/PC1");
    mq_unlink("/PC2");

    cola[0] = mq_open("/PC1", O_RDWR | O_CREAT, S_IRUSR | S_IWUSR | S_IRGRP | S_IROTH, &attrq);
    cola[1] = mq_open("/PC2", O_RDWR | O_CREAT, S_IRUSR | S_IWUSR | S_IRGRP | S_IROTH, &attrq);

    if (pthread_create(&th1, NULL, HebraVisitas, &ids[0]) != 0) {
        perror("Error en pthread_create th1: ");
        exit(-1);
    }
    if (pthread_create(&th2, NULL, HebraVisitas, &ids[1]) != 0) {
        perror("Error en pthread_create th2: ");
        exit(-1);
    }
    if (pthread_create(&thSrv, NULL, IncVisitantesSelect, NULL) != 0) {
        perror("Error en pthread_create thSrv: ");
        exit(-1);
    }

    if (pthread_join(th1, NULL) != 0 || pthread_join(th2, NULL) != 0 || pthread_join(thSrv, NULL) != 0) {
        perror("Error en pthread_join: ");
        exit(-1);
    }

    printf("El numero de visitas totales = %ld\n", Visitantes);

    mq_close(cola[0]);
    mq_close(cola[1]);
    mq_unlink("/PC1");
    mq_unlink("/PC2");
    return 0;
}
