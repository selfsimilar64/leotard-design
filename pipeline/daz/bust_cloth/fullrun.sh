#!/bin/bash
cd "$(dirname "$0")"
POSES=$(python -c "
import sys; sys.path.insert(0,'C:/Users/mattj/leotard-design/pipeline/daz'); import bodies; print(','.join(['a-pose']+[p['key'] for p in bodies.POSES]))")
for b in teen older-teen young petite adult broad child child-6; do
  python sweep_score.py $b "$POSES" "{'B3':dict(jump=1.0,cling=0.001,cling_mode='pressure',smooth_settle=True,slide=True,lam=5.0,mu=0.05,cut_mode='edge',cut_core=0.5)}" >> full_scores.txt 2>&1
  G1=$(echo $POSES | cut -d, -f1-11); G2=$(echo $POSES | cut -d, -f12-21); G3=$(echo $POSES | cut -d, -f22-31)
  python vis.py full-$b-1 $b "$G1" today,B3 normal back,low 0.18 bottom
  python vis.py full-$b-2 $b "$G2" today,B3 normal back,low 0.18 bottom
  python vis.py full-$b-3 $b "$G3" today,B3 normal back,low 0.18 bottom
  echo "done $b" >> full_scores.txt
done
