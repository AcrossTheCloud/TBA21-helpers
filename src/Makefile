CFLAGS = -DNO_JASPER -O4 -llcms2 -lm -ljpeg -lpthread
CC = gcc

# ****************************************************
# Targets needed to bring the executable up to date

dcraw: 
	$(CC) -static $(LDFLAGS) -o dcraw dcraw.c $(CFLAGS) 
