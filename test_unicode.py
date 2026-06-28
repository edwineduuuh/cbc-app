# -*- coding: utf-8 -*-
chem_path = r'C:\Users\LENOVO T14\Desktop\cbc-app\frontend\src\components\ChemTextBar.js'
phys_path = r'C:\Users\LENOVO T14\Desktop\cbc-app\frontend\src\components\PhysicsFormulaBar.js'

# superscripts / subscripts we need
sup = {1:'\u00b9',2:'\u00b2',3:'\u00b3',4:'\u2074',5:'\u2075',6:'\u2076',7:'\u2077',8:'\u2078',9:'\u2079',0:'\u2070'}
sub = {0:'\u2080',1:'\u2081',2:'\u2082',3:'\u2083',4:'\u2084',5:'\u2085',6:'\u2086',7:'\u2087',8:'\u2088',9:'\u2089'}
plus='\u207a'; minus='\u207b'

def s(*digits): return ''.join(sup[d] for d in digits)
def b(*digits): return ''.join(sub[d] for d in digits)

arrow='\u2192'; equil='\u21cc'; up='\u2191'; dn='\u2193'
delta='\u0394'; deg='\u00b0'; pm='\u00b1'; neq='\u2260'; leq='\u2264'; geq='\u2265'
times='\u00d7'; div='\u00f7'; sqrt='\u221a'; half='\u00bd'
alpha='\u03b1'; beta='\u03b2'; gamma='\u03b3'; lam='\u03bb'; mu='\u03bc'; pi='\u03c0'; theta='\u03b8'; omega='\u03c9'
inf='\u221e'; propto='\u221d'; sigma='\u2211'

# ion helper
def ion(sym, charge): return sym + charge

print(f"Tab e{minus} Config sample: 1s{s(1)} 1s{s(2)} 3d{s(1,0)}")
print(f"Ion sample: Ca{s(2)}{plus} SO{b(4)}{s(2)}{minus}")
print("Symbols sample:", arrow, equil, delta)