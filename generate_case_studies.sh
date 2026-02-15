#!/bin/bash

# Copy case-study-jean-fr.html to case-study-jean-de.html and case-study-jean-es.html
cp case-study-jean-fr.html case-study-jean-de.html
cp case-study-jean-fr.html case-study-jean-es.html

# Copy case-study-maria-fr.html to case-study-maria-de.html and case-study-maria-es.html
cp case-study-maria-fr.html case-study-maria-de.html
cp case-study-maria-fr.html case-study-maria-es.html

# Copy case-study-alice-fr.html to all alice language variants
cp case-study-alice-fr.html case-study-alice-de.html
cp case-study-alice-fr.html case-study-alice-es.html
cp case-study-alice-fr.html case-study-alice-it.html
cp case-study-alice-fr.html case-study-alice-pt.html
cp case-study-alice-fr.html case-study-alice-ar.html
cp case-study-alice-fr.html case-study-alice-ja.html
cp case-study-alice-fr.html case-study-alice-ru.html
cp case-study-alice-fr.html case-study-alice-zh.html

# Update lang attributes in each file
for file in case-study-jean-de.html case-study-jean-es.html case-study-maria-de.html case-study-maria-es.html case-study-alice-de.html case-study-alice-es.html case-study-alice-it.html case-study-alice-pt.html case-study-alice-ar.html case-study-alice-ja.html case-study-alice-ru.html case-study-alice-zh.html; do
  # Extract language code from filename
  lang=${file%-*}
  lang=${lang##*-}
  
  # Update lang attribute
  sed -i "s/<html lang=\"fr\" dir=\"ltr\">/<html lang=\"$lang\" dir=\"ltr\">/g" "$file"
  
  # For Arabic and Hebrew, add dir="rtl"
  if [[ "$lang" == "ar" || "$lang" == "he" ]]; then
    sed -i "s/<html lang=\"$lang\" dir=\"ltr\">/<html lang=\"$lang\" dir=\"rtl\">/g" "$file"
  fi
  
  echo "Created $file"
done

echo "All case study files generated successfully!"
