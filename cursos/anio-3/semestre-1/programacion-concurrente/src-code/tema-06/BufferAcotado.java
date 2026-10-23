/**
 * Especificación de Laboratorio — Tema 6 (Págs. 23-28): Monitor de Buffer Acotado en Java
 * Demuestra el uso de métodos synchronized, comprobación de condición en bucle while,
 * wait() y notifyAll() para múltiples productores y múltiples consumidores.
 */
public class BufferAcotado {
    private int cima;
    private int capacidad;
    private int[] vector;

    public BufferAcotado(int i) {
        cima = 0;
        capacidad = i;
        vector = new int[i];
    }

    public synchronized int coger() {
        while (cima == 0) {
            try {
                wait();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        notifyAll(); // Ya hay sitio libre en el buffer
        return vector[--cima];
    }

    public synchronized void poner(int elem) {
        while (cima == capacidad - 1) {
            try {
                wait();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        vector[cima] = elem;
        cima++;
        notifyAll(); // Ya hay elementos producidos disponibles
    }

    public static void main(String[] args) {
        int CAPACIDAD = 3;
        BufferAcotado buf = new BufferAcotado(CAPACIDAD);
        buf.poner(1);
        buf.poner(2);
        System.out.println("Elemento extraido: " + buf.coger());
        System.out.println("Elemento extraido: " + buf.coger());
    }
}
