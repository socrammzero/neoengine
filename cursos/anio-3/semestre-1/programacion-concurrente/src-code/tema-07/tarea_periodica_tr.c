/*
 * Especificación de Laboratorio — Tema 7 (Págs. 3-20): Tarea Periódica de Tiempo Real en POSIX
 * Compilación: gcc -Wall -Wextra -std=c11 -pthread tarea_periodica_tr.c -o tarea_periodica_tr -lrt
 * Integra:
 *  1. Bloqueo de páginas en RAM física (mlockall MCL_CURRENT | MCL_FUTURE).
 *  2. Atributos de planificación expulsiva por prioridad fija (PTHREAD_EXPLICIT_SCHED + SCHED_FIFO).
 *  3. Normalización canónica de struct timespec (pág. 20 del Tema 7).
 *  4. Espera absoluta libre de deriva acumulativa con clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME).
 */

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <sched.h>
#include <time.h>
#include <sys/mman.h>
#include <assert.h>

#define PERIODO_MS  250
#define ACTIVACIONES 4

static void normalizar(struct timespec *tm) {
    if (tm->tv_nsec >= 1000000000L) {
        tm->tv_sec += (tm->tv_nsec / 1000000000L);
        tm->tv_nsec = (tm->tv_nsec % 1000000000L);
    } else if (tm->tv_nsec <= -1000000000L) {
        tm->tv_sec += -(-tm->tv_nsec / 1000000000L);
        tm->tv_nsec = -(-tm->tv_nsec % 1000000000L);
    }
    if ((tm->tv_sec > 0) && (tm->tv_nsec < 0)) {
        tm->tv_nsec += 1000000000L;
        tm->tv_sec -= 1;
    } else if ((tm->tv_sec < 0) && (tm->tv_nsec > 0)) {
        tm->tv_nsec -= 1000000000L;
        tm->tv_sec += 1;
    }
    assert((tm->tv_sec >= 0 && tm->tv_nsec >= 0 && tm->tv_nsec < 1000000000L) ||
           (tm->tv_sec < 0 && tm->tv_nsec > -1000000000L && tm->tv_nsec <= 0));
}

void *TareaPeriodica(void *param) {
    int id = *(int *)param;
    struct timespec next_activation;
    int ciclo;

    if (clock_gettime(CLOCK_MONOTONIC, &next_activation) != 0) {
        perror("Error en clock_gettime: ");
        exit(-1);
    }

    for (ciclo = 1; ciclo <= ACTIVACIONES; ciclo++) {
        next_activation.tv_nsec += PERIODO_MS * 1000000L;
        normalizar(&next_activation);

        if (clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, &next_activation, NULL) != 0) {
            perror("Error en clock_nanosleep: ");
            exit(-1);
        }

        printf("[Tarea TR %d] Ciclo %d ejecutado en instante %ld.%09ld s\n",
               id, ciclo, (long)next_activation.tv_sec, next_activation.tv_nsec);
    }
    pthread_exit(NULL);
}

int main(void) {
    pthread_t th;
    pthread_attr_t attr;
    struct sched_param param;
    int ids[1] = {0};

    /* Bloquear páginas presentes y futuras en RAM física */
    if (mlockall(MCL_CURRENT | MCL_FUTURE) == -1) {
        perror("Aviso mlockall (requiere privilegios RT): ");
    }

    pthread_attr_init(&attr);
    pthread_attr_setinheritsched(&attr, PTHREAD_EXPLICIT_SCHED);
    pthread_attr_setschedpolicy(&attr, SCHED_FIFO);
    param.sched_priority = 50;
    pthread_attr_setschedparam(&attr, &param);

    if (pthread_create(&th, &attr, TareaPeriodica, &ids[0]) != 0) {
        /* Fallback con atributos por defecto si no se ejecuta como superusuario */
        if (pthread_create(&th, NULL, TareaPeriodica, &ids[0]) != 0) {
            perror("Error en pthread_create: ");
            exit(-1);
        }
    }

    if (pthread_join(th, NULL) != 0) {
        perror("Error en pthread_join: ");
        exit(-1);
    }

    munlockall();
    return 0;
}
